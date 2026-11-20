# Step 3: staff users, roles, 2FA and access control

## Context
Build order step 3 (CLAUDE.md). Requirements: FR-CMS-05/06/07, SRS Section 10, NFR-SEC-01..07, -09, -20.
Today `Users` is Payload's blank-template stub (`auth: true`, no roles), and `Media` relies on Payload's
default access (any logged-in user can write). Payload 3.90.2 has no built-in 2FA or rate limiting.
Branch `feat/step-3-users-roles`, small commits, no push until told.

Decisions made by the owner: payload-totp plugin + admin reset (no recovery codes); offline common-password
list + HIBP range check; test-only collection env-flagged with its table in migrations; several roles per user.

## Findings from reading Payload 3.90.2 and payload-totp 3.0.6 source
- Auth options available: `maxLoginAttempts`, `lockTime`, `tokenExpiration`, `useSessions` (default on),
  `useAPIKey` (default off), `cookies.{secure,sameSite,domain}`, `removeTokenFromResponses`,
  `forgotPassword.{expiration,minRequestInterval}`. Config-level `csrf` origin allow-list.
- HttpOnly is always set by Payload. Default `secure` is false, SameSite default Lax.
- `LockedAuth` ("user is locked") differs from the wrong-password message, so it reveals that an email exists.
- `resetPassword` hashes the password before any hook runs, so a hook cannot enforce password policy on reset.
- `beforeOperation` hooks run for `login`, `forgotPassword`, `refresh`. Custom collection endpoints are
  registered before the defaults, so one on `/reset-password` replaces the built-in.
- Config/collection `afterError` hooks can rewrite REST error responses and status codes.
- payload-totp: `forceSetup` makes setup mandatory and wraps every collection's access, so a session without
  a verified code has no access. Its gaps: no recovery codes, no admin reset (removing requires the user's own code,
  blocked by forceSetup), a used code can be replayed inside its ±1 step window, setup accepts a secret sent by
  the client, the "verified" cookie is not tied to a Payload session id, and the secret is stored unencrypted.

## Design

### Roles and capabilities (`src/access/roles.ts`)
- `ROLES`: `administrator`, `publisher`, `editor` (with labels).
- `CAPABILITIES`: map of capability to roles, e.g. `users:manage`, `audit:read`, `settings:manage`
  (administrator); `content:publish` (administrator, publisher); `content:edit` (all three); `admin:access` (all three).
- `hasCapability(user, cap)`: true if any of the user's roles grants the capability.
- **Phase 2/3 extension:** add `complaints-officer` to `ROLES` and a `complaints:handle` capability. New collections
  use `can('complaints:handle')`. No helper or existing collection changes. Adding a role needs one migration
  (Postgres enum value). Public accounts (Phase 2) will be a separate auth collection, never `users`.

### Access helpers (`src/access/index.ts`)
`denyAll`, `isAuthenticatedStaff`, `isAdmin`, `isPublisherOrAbove`, `isEditorOrAbove`, `can(cap)`, `isSelf`,
`isAdminOrSelf`, `publishedOnly` (staff: all; public: `_status = published`), plus `canWriteDraftOnly`
(create/update allowed for editors only when not publishing or unpublishing; publishers and administrators always).
Every helper also requires a 2FA-verified session (`user._strategy === 'totp'`) as a second layer behind the plugin.
`requireCapability(req, cap)` for custom endpoints.

### Deny by default (`src/access/deny-by-default.ts`)
A config plugin, listed last, that sets any missing collection or global access operation to `denyAll`, so Payload's
"any logged-in user" default never applies to our collections. Payload's own internal collections keep their access.
`Media` gets explicit access: public read, editor+ create/update, publisher+ delete.

### Users collection (`src/collections/Users.ts`)
- Fields: `name` (required), `roles` (multi-select, at least one). Field access: only administrators can set
  `roles`, never on their own account. A `beforeChange` guard also throws Forbidden on role change by a
  non-admin or by the user themselves (second layer).
- Collection access: create, delete, unlock: admin. Read and update: admin or self. Admin panel: staff only.
- No public registration: `create` is admin-only. Payload's first-register endpoint already refuses once any
  user exists; first user gets `administrator` forced in a hook.
- Last administrator: delete or demote is refused if it would leave no administrator, checked under a Postgres
  transaction advisory lock so two admins cannot remove each other at the same time. No self-delete.
- Auth: `maxLoginAttempts: 5`, `lockTime: 15 min`, `tokenExpiration: 3600` (1-hour idle; the admin refreshes
  while active), absolute 12-hour session cap via `beforeOperation('refresh')`, `useAPIKey: false`,
  `removeTokenFromResponses: true`, cookies `sameSite: 'Strict'`, `secure` on whenever `SITE_URL` is https
  (startup refuses production with a non-localhost http URL). `csrf: [SITE_URL]`.
- Sessions revoked on password change, role change, and 2FA reset.
- Locked-account error rewritten to the same generic 401 as a wrong password (`afterError`).

### Password policy (`src/lib/auth/password-policy.ts`)
Minimum 12, maximum 128 characters. Rejected if in a bundled list of the 10,000 most common passwords (SecLists,
MIT, a text file), or if it contains the email's local part or "ogserc". Then the HIBP range API (k-anonymity, only the first 5 chars of
the SHA-1 hash leave the server, `Add-Padding` header). If HIBP is unreachable, the check is skipped with a
warning (fail-open). `PASSWORD_BREACH_CHECK=off` disables it (CI). Enforced in `beforeValidate` (create, update,
first user) and, for reset links, in a `beforeOperation` hook on Payload's own reset (D-053).

### Rate limiting (`src/lib/auth/rate-limit.ts`)
A hidden `rate-limits` collection (deny-all access) with an atomic, parameterised `INSERT ... ON CONFLICT ... RETURNING`
counter through Payload's Drizzle instance. Keys are HMACs of IP and email. Limits: login 10 per 15 min per IP and
5 per 15 min per email, forgot password 5 per hour per IP and 3 per hour per email, reset password 10 per hour per IP,
TOTP verify 10 per 15 min per IP. Returns a generic 429 with `Retry-After`. Client IP comes from `CLIENT_IP_HEADER`
(documented per host). Expired rows are cleaned up as it runs. General admin and API rate limiting and Turnstile bot
protection are deferred (WAF in step 13, Turnstile in step 5) and reported.

### Two-factor authentication
- `payload-totp@3.0.6` with `forceSetup: true`, issuer "OGSERC", on `users` only.
- Wrappers around its endpoints (`src/lib/auth/totp-guards.ts`):
  - Reject a code already accepted for that user in the last 90 seconds.
  - At setup, reject secrets under 160 bits.
  - Rate limit the code check.
  - Write audit entries.
- `POST /api/users/:id/reset-2fa`: administrator with a verified session only. Clears the secret, revokes the target's
  sessions, records an audit entry. A button for it on the user edit screen.
- Emergency reset `pnpm auth:reset-2fa <email>` (a `payload run` script) for when the last administrator loses their device;
  needs `DATABASE_URL`, audited as `system:cli`. The runbook requires at least two administrators.

### Audit log (`src/collections/AuditLog.ts`)
- Actions: login success/failure, account locked, logout, 2FA enrolled/verified/failed/reset, user created/updated/deleted,
  role changed, password changed, password reset requested/completed.
- Stores: timestamp, actor (relationship + email snapshot), target (id + email snapshot), IP, user agent,
  and `details` built from an allow-list of field names and old/new roles. No values of secrets are ever written.
- Access: read admin; create/update/delete `denyAll` (written only by server hooks via the Local API).
  No create button, no bulk edit.
- IP retention period to be set by OGSERC (NFR-SEC-19); noted in open items.

### Email (`src/lib/email/adapter.ts`, no new dependency)
- Development: the full message, including the reset link, goes to the server console only when `NODE_ENV=development`.
- Production without SMTP: the message is dropped, and a log line with the subject only is written; forgot password still
  answers with the same generic response.
- The SMTP adapter (`@payloadcms/email-nodemailer`, official) is added in step 5 with the contact form; it is required
  before production (RUNBOOK).

### Migrations
One migration per commit that changes schema. Existing development accounts with no roles get `administrator` and
must set up 2FA at next login.

## Commits (each revertible)
1. Roles, capabilities, access helpers, deny-by-default; explicit Media access. **Done** (2a65ad9).
2. Users hardening (fields, guards, auth options, cookies, CSRF, sessions, lockout message) + migration.
   **Done** (2026-10-21) in eight commits, no migration needed: f881738 (1-hour token, token only in the cookie, API keys off,
   SameSite=Strict), 407ee4e (CSRF origin, https in production), 4b171f6 (lockout, one reply for every failed sign-in),
   7a0caf7 (`pnpm auth:unlock`), 4582f40 (12-hour session limit), 2f171dd (sessions end on a role change), edf077a (no
   self-delete), 71fa28e (last administrator), plus docs. All green in CI. Details and trade-offs in D-052. Differences from the
   design above: Secure follows NODE_ENV (not SITE_URL); the locked-account reply is decided by endpoint and status, not by error
   class; the last-administrator rule runs once per operation in `beforeOperation`, not per document, because bulk documents
   run in parallel; first-register returns no token.
3. Password policy (offline list + HIBP) and replacement reset-password endpoint.
   **Done** (2026-11-19): 583322c (common-passwords list), bc81927 (create, update, first user), d6700d2 (no bulk
   password change), 0e2d4ab (reset path), then the reset-link and trusted-code tests and D-053. Difference from the design
   above: no replacement endpoint; a `beforeOperation` hook checks the password on Payload's own reset, before it hashes it
   (D-053). HIBP added the same day as its own commit (`src/lib/auth/breach-check.ts`, fail-open).
4. Rate limiting + migration.
   **Done** (2026-11-20, D-081). Differences from the design above: per email, sign-in counts only failed attempts and the
   limit is 10, above the lockout's 5, so the lockout's single reply (D-052) still shows; counts are written outside the
   request's transaction; production requires `CLIENT_IP_HEADER`; the TOTP limit moves to commit 6.
5. Audit log + hooks + migration.
   **Done** (2026-11-20, D-083). Differences from the design above: the email typed for an unknown account is never stored;
   "account locked" is detected from the lock state read before the attempt; refused sign-ins are written outside the request's
   transaction; image events are included (Media); retention (owner, 2026-11-20): addresses and browsers blanked after 90 days,
   entries deleted after 2 years, by `deploy/prune-audit.sh`. 2FA events come with commit 6.
6. 2FA plugin, guards, admin reset, emergency CLI + migration.
   **Part A done** (2026-11-20, D-084): payload-totp 3.0.7 (3.0.6 fixed the brute-force advisory with its own code lock),
   forced set-up, the four guards (address limit, no code reuse, secret size, audit), proxy.ts, test helpers and tests.
   Part B: the administrator reset and the emergency command.
7. Email adapter (dev console / prod drop).
8. Test-only collection (`E2E_TEST_COLLECTIONS=true`) + migration, test user seeding, Playwright auth tests.
9. Docs: README, RUNBOOK (first admin, 2FA reset, email), DECISIONS (D-044+), CLAUDE.md "Authentication and access",
   `.env.example`.

## Tests (`tests/e2e/auth/`, separate Playwright project "auth", Desktop Chrome, serial)
- Setup: `pnpm payload run tests/e2e/support/seed-auth.ts` creates per-run test users per role with random passwords
  and TOTP secrets (Local API, `@test.invalid` emails); teardown deletes them. Codes computed with `otpauth`
  (added as a direct devDependency; it is already pulled in by the plugin).
- Cases:
  - Logged-out access is denied with generic errors.
  - Role matrix: editor cannot publish, unpublish, delete published, create users or change roles; publisher cannot
    manage users; administrator can.
  - Users cannot escalate their own roles by direct API call.
  - Last administrator: cannot be self-demoted or deleted, cannot be removed in a bulk delete that includes them,
    and parallel cross-demotion leaves at least one administrator.
  - Lockout after 5 failures, with an identical message for unknown and locked emails.
  - Password alone gives no access over REST or the admin; a valid code does; a replayed code fails.
  - Registration is closed.
  - Password policy is enforced on create and reset.
  - Rate limit returns 429.
  - Audit entries are written, readable only by administrators, and not editable or deletable.
  - No secrets in API responses or in the server log file.
- The server writes logs to a file in test runs (`PAYLOAD_LOG_FILE`) so tests can scan them; the log test is skipped
  if the file is absent (local reuse of the dev server).
- Existing tests (including the 1024px header tests) stay unchanged and must pass.

## Verification
`pnpm lint`, `pnpm typecheck`, `pnpm migrate`, `pnpm build`, `pnpm test:e2e` (all projects), `pnpm audit --audit-level high`,
manual walk-through of each role in the browser, security checklist report.

## Review round before commit 2

Added 2026-10-15 at the owner's request, after commit 1 (2a65ad9). Each group is its own revertible commit.

### Already done in this round
| Commit | Contents |
|---|---|
| 98cfc31 | B (part): startup checks (PAYLOAD_SECRET at least 32 characters, SITE_URL in production, E2E flag refused in production); cookie Secure from NODE_ENV; safer role parsing. D (part): hasCapability unit tests. `pnpm test:unit` in CI |
| 7223c0a | B (part): final-config access audit test (every operation on every collection and global, allowAll allow-list), Payload internals hardened, REST limit cap 100, maxDepth 3 |

### Findings from Payload 3.90.2 source
- **Uploads** (`payload/dist/uploads/checkFileRestrictions.js`): with `mimeTypes` set, Payload detects the type from
  the content (file-type) and rejects a detected type that is not allowed. If nothing is detected (for example plain
  HTML), it falls back to the file extension and only logs a warning, so an HTML file renamed `.png` probably passes.
  A content check is needed (NFR-SEC-08). SVG is detected and rejected when not in the list.
- **Size**: Payload has only a global multipart `upload.limits.fileSize`; there is no per-collection limit. The SRS
  gives no figure.
- **Email field** (`auth/baseFields/email.js`, `fields/mergeBaseFields.js`): a collection field named `email` is
  deep-merged over the built-in one, and ours wins. To be confirmed against the Payload 3.90 documentation before
  changing it. Field access that denies an update drops the value silently, so tests assert the email is unchanged.
- **CI**: the e2e job uses a Postgres service container on localhost, database `ogserc`.

### Test isolation and database safety
- Every DB-backed test project starts its own server with `DATABASE_URL` set to `TEST_DATABASE_URL` and never reuses
  an existing server. The harness verifies and prints the host and database name the running app is actually
  connected to, and aborts if they differ from `TEST_DATABASE_URL`.
- Wipe guard (`tests/support/test-db.ts`), run before any wipe: refuses if `NODE_ENV=production`, if the database name
  does not contain `e2e` or `test`, or if host and database name equal those in `DATABASE_URL`. Prints only the host
  and database name. No bypass flag.
- CI path: the e2e job creates database `ogserc_e2e` in its service container and sets `TEST_DATABASE_URL` to it, so it
  passes the same rules with no exemption.
- Before the first wipe, the guard is run alone and its output shown to the owner for confirmation.

### A. Media uploads
- `upload.mimeTypes`: exactly `image/jpeg`, `image/png`, `image/webp`, `image/avif`. No wildcard, no SVG.
- Content check (`src/lib/uploads/image-signature.ts`, no new dependency): magic bytes must match one of the four
  formats, and the declared type and extension must agree with them. Generic 400.
- Size: 5 MB per image on Media (raised to 10 MB on 2026-10-16, D-045); global upload ceiling 25 MB so Step 4 PDFs are not cut off.
- `update: isPublisherOrAbove` (create stays editor and above).
- DECISIONS: Media rules; Step 4 open question on files referenced by drafts (an uploaded file is public at its URL
  before its document is published); PDF size limit is an open question for OGSERC.
- Tests: `.html`, `.svg`, HTML renamed `.png`, a file whose declared type disagrees with its content, and an oversized
  image are rejected; a valid small PNG is accepted; an editor cannot update, a publisher can.

### B. First user
- On the empty test database: first-register creates an administrator; a second first-register is refused; two
  simultaneous first-register requests leave exactly one user, an administrator, and the test reports how many users
  exist afterwards. If it fails, the first-user hook is serialised with a transaction-scoped Postgres advisory lock.
- A loud production startup error log when there are zero users.
- `TEST_DATABASE_URL` in `.env.example`, README and RUNBOOK.

### C. Users hardening tests
- One shared login helper (`tests/e2e/support/auth.ts`), because the 2FA commit will change what login involves.
- A non-admin cannot set roles by field; a bulk update that includes your own id cannot change your role; a user with
  no roles gets 403; demotion takes effect on the next request; roles removed from the JWT; an unknown role string and
  an empty roles list are rejected.
- A non-admin cannot change `lockUntil`, `loginAttempts`, `hash`, `salt`, `resetPasswordToken`,
  `resetPasswordExpiration`, `_verified`, `apiKey` or `enableAPIKey` on their own record.
- Email editable by administrators only, and read-only in the admin for everyone else.

### D. Content saving and Local API rule
- canSaveContent test (an editor updating a published document without `_status`, and an editor setting
  `_status: published`); replaced with a `beforeChange` hook comparing stored and new status if it can be bypassed.
- CLAUDE.md and DECISIONS: "Payload's Local API skips access control by default. Every query that feeds a public page
  must set overrideAccess: false, or explicitly filter to published documents. Step 4 must have a test proving a draft
  never appears on a public page, in search, or in the sitemap." Addition: `overrideAccess: true` is used only in
  trusted server code (hooks, seed, migrations), never with values taken from the request.
- DECISIONS: the list of allowAll uses (currently `media.read` only), kept in step with the config-access test.

### Per-commit checks
`pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, relevant e2e tests, `pnpm migrate:status`; each commit reported with
its diff summary and the security checklist. No push.
