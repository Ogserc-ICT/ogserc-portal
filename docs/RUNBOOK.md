# OGSERC portal runbook

How to set up, deploy, migrate, and move the portal. Keep this current whenever setup, deployment, or operations change.

> Status: build step 1 (scaffold). Sections marked *(to be completed)* are filled in as the matching build step lands.

---

## 1. Environment variables

Every setting comes from environment variables. The full list, with explanations, is in [`.env.example`](../.env.example). In production, set them in the host's secret store; never in files committed to the repository.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use `sslmode=verify-full` for hosted databases. |
| `PAYLOAD_SECRET` | Yes | Long random string that signs login sessions. Different in every environment. Changing it logs everyone out. |
| `SITE_URL` | Yes | Public address of the site, e.g. `https://example.gov.ng`, without a trailing slash. |
| `S3_*` | From step 4 | S3-compatible file storage for uploads. |
| `SMTP_*`, `EMAIL_FROM`, `CONTACT_FORM_TO` | From step 5 | Email for the contact form. |
| `TURNSTILE_*` | From step 5 | Bot protection on forms. |

## 2. GitHub repository settings (one-time, done by hand)

These cannot be set from code. Do them once in GitHub, and again if the repository is ever transferred to another account (see Section 9). NFR-OPS-01 requires a private repository with a protected main branch and changes merged through pull requests.

> **Check the GitHub plan.** For a *private* repository under a personal account, branch protection (step 1) and secret scanning (step 2) may need a paid GitHub plan or add-on. Confirm on GitHub's current pricing pages. If a setting is unavailable, record that in `docs/DECISIONS.md` together with what is used instead.

1. **Protect `main`.** Settings → Rules → Rulesets → New branch ruleset.
   - Target: the default branch.
   - Turn on: *Restrict deletions*, *Require a pull request before merging* (1 approval), *Require status checks to pass*, *Block force pushes*.
   - Under status checks, add: `Lint, typecheck, audit`, `Build and end-to-end tests (Playwright + axe)`, and `Docker image builds`. They appear in the list after CI has run once.
2. **Secret scanning.** Settings → Code security → turn on *Secret scanning* and *Push protection* (NFR-SEC-10).
3. **Dependabot.** On the same page, turn on *Dependabot alerts* and *Dependabot security updates*. Version updates are already configured in `.github/dependabot.yml`.
4. **Account security.** Require two-factor authentication for everyone with access to the repository.

## 3. Database migrations

The database structure only changes through migration files in `src/migrations/` (see D-008 in `docs/DECISIONS.md`).

**After changing a collection or field (development):**

```sh
pnpm migrate:create describe-the-change   # writes a new file in src/migrations/
pnpm migrate                              # applies it to your dev database
```

Review the generated file, then commit it with the code change.

**Check what has run:** `pnpm migrate:status`

**In production:** pending migrations run automatically when the server starts. To run them by hand instead (for example before switching traffic), set the production environment variables and run `pnpm migrate`.

**Before any production migration:** take a database backup (Section 6).

## 4. First admin account

On a brand-new, empty database, `/admin` shows a "create first user" screen that **anyone who reaches the site can use**. On every new database (staging or production), create the first administrator account yourself **before the site is reachable by anyone else**. Do this before pointing DNS at it or sharing the address.

## 5. Deploying *(to be completed in step 13)*

### Vercel

*(to be completed: project settings, environment variables, spend limits, NFR-HOST-03)*

### Any Docker host (VPS, Railway, Render, Fly.io, ...)

```sh
docker build -t ogserc-portal .
docker run --env-file .env -p 3000:3000 ogserc-portal
```

The container listens on port 3000. Put it behind HTTPS (the host's load balancer, or a reverse proxy such as Caddy or nginx). Migrations run on startup.

**Local portability check** (production image plus a throwaway local Postgres; requires Docker):

```sh
PAYLOAD_SECRET=any-long-random-string docker compose up --build
```

## 6. Backups and restore *(to be completed in step 13)*

## 7. Moving to another host

1. **Deploy the code** to the new host (Docker image or Node.js build).
2. **Set environment variables** there (Section 1). Use a new `PAYLOAD_SECRET` only if you accept that everyone will be logged out.
3. **Restore the database dump:**
   ```sh
   pg_dump --format=custom --no-owner --no-acl "$OLD_DATABASE_URL" > ogserc.dump
   pg_restore --no-owner --no-acl --dbname "$NEW_DATABASE_URL" ogserc.dump
   ```
4. **Copy storage files** from the old S3-compatible bucket to the new one *(commands added in step 4)*.
5. **Update DNS** to point at the new host, and confirm HTTPS works.
6. Run `pnpm migrate:status` against the new database to confirm it is up to date.

## 8. Monitoring and incident response *(to be completed in step 13)*

## 9. Account access and recovery

Required by SRS Section 2.2 and NFR-HOST-01. The accounts behind the site may be held under whichever accounts the developer and OGSERC choose. This section records, for each one, who can administer it and how to recover or move it, so the site never depends on a single person being available.

**Never write passwords, keys, recovery codes, or connection strings in this file or anywhere in the repository.** Keep them in a password manager. This file only says *where* they are kept. Keep the names of administrators current; replace each `<placeholder>` when the account is set up.

### 9.1 Rules for every account

- Two-factor authentication is on (NFR-SEC-14). Recovery codes are stored in the password manager, not on the same phone as the authenticator app.
- Where practical, at least two trusted people can administer the account (NFR-HOST-01). Each uses their own login; no shared logins (NFR-SEC-03).
- The account's recovery email address is one that more than one person can read, or is listed below with who controls it.
- When someone leaves, remove their access the same week (NFR-SEC-04) and rotate any keys they could see.
- Review this section every three months and after any change of administrator. Last reviewed: `<date>` by `<name>`.

### 9.2 Account register

| Account | Used for | Provider | Account holder | Administrators | Credentials stored in | Status |
|---|---|---|---|---|---|---|
| GitHub | Source code, CI, Dependabot | GitHub | `thekamiyeoladipo` (personal account) | `<name>`, `<name>` | `<password manager / vault>` | Active |
| Hosting | Runs the website | `<Vercel or Docker host>` | `<account / team name>` | `<name>`, `<name>` | `<password manager / vault>` | Step 13 |
| Database | PostgreSQL (dev branch, staging, production) | `<Neon / Supabase / other>` | `<account / project name>` | `<name>`, `<name>` | `<password manager / vault>` | Dev in use |
| Domain registrar | Domain name registration | `<registrar>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | `<domain to be confirmed>` |
| DNS / CDN / WAF | DNS records, DDoS and bot protection, Turnstile | `<e.g. Cloudflare>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 5 / 13 |
| File storage | Uploaded documents and images (S3-compatible) | `<provider>` | `<account / bucket>` | `<name>`, `<name>` | `<password manager / vault>` | Step 4 |
| Email sending | Contact form delivery (SMTP) | `<provider>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 5 |
| Receiving mailbox | OGSERC inbox for contact form messages | `<provider>` | `<OGSERC mailbox address>` | `<name>` | Held by OGSERC | Step 5 |
| Error and uptime monitoring | Alerts on downtime and errors | `<provider>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 13 |
| Analytics | Privacy-friendly site analytics (FR-WEB-07) | `<Plausible / Umami / self-hosted>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 11 |
| Payment provider | Licence and application fees | `<to be agreed with OGSERC>` | — | — | — | Phase 3 only; do not create before then |

### 9.3 How to recover or move each account

**General recovery**, if an administrator loses access: another administrator signs in and restores access, or resets that person's second factor. If nobody can sign in, use the stored recovery codes. As a last resort, use the provider's account-recovery process, which normally asks for proof of ownership (the recovery email, billing details, or domain DNS control). Do this before the account is needed in an emergency, not during one.

**GitHub**
- Recover: sign in with recovery codes, or use GitHub's account recovery from the sign-in page.
- Move: Settings → General → Danger Zone → *Transfer ownership* to another user or organisation. Issues, pull requests, and history move with it. Afterwards, update `.github/CODEOWNERS`, check that the repository is still private, and redo the settings in Section 2 (rulesets and secret scanning do not always carry over).

**Hosting**
- Recover: through another member of the hosting team or project, or the provider's recovery process.
- Move: follow Section 7. Set the environment variables (Section 1) on the new host, deploy, test, then switch DNS. On Vercel, a project can also be transferred between teams in its settings.

**Database**
- Recover: through another project member, or the provider's recovery process. The data itself is protected by the backups in Section 6.
- Move: `pg_dump` from the old database and `pg_restore` into the new one (Section 7, step 3), update `DATABASE_URL`, then check with `pnpm migrate:status`. Give the app's database user only the permissions it needs (NFR-SEC-13).

**Domain registrar**
- Recover: through the registrar's account recovery. Keep the registrant contact details current, because recovery often depends on them.
- Move: export the DNS records first. Then remove the registrar lock, get the transfer (EPP/auth) code, start the transfer at the new registrar, and turn the lock back on. Domain transfers can take several days; do not schedule one close to a launch. Re-check DNSSEC afterwards.

**DNS / CDN / WAF**
- Recover: through another account member, or the provider's recovery process.
- Move: export all DNS records (including SPF, DKIM, DMARC), recreate them at the new provider, then change the domain's nameservers at the registrar. Turnstile keys are tied to the account: create new ones and update `TURNSTILE_*`.

**File storage**
- Recover: through another account member, or the provider's recovery process.
- Move: create the new bucket, copy all objects across with the provider's sync tool or any S3-compatible copy tool, update the `S3_*` variables, then check that documents download on the site. Commands are added in build step 4.

**Email sending**
- Recover: through another account member, or the provider's recovery process.
- Move: set up the new provider, update the SPF and DKIM DNS records (and DMARC if needed) (NFR-SEC-15), update the `SMTP_*` and `EMAIL_FROM` variables, then send a test message through the contact form.

**Receiving mailbox**
- Held by OGSERC. To change it, update `CONTACT_FORM_TO` and send a test message through the contact form.

**Error and uptime monitoring / Analytics**
- Recover: through another account member, or the provider's recovery process.
- Move: create the new account and replace the site key or snippet configuration. Historic data usually stays with the old provider; export it first if it is needed.

**Payment provider (Phase 3)**
- Not set up in Phase 1. When it is, add its recovery and move steps here, including how webhook signing secrets are rotated (NFR-SEC-21).
