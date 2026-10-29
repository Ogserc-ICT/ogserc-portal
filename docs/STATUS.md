# Project status

Updated 2026-10-29. Branch `feat/step-3-users-roles`, draft PR #16 (stays a draft), plan `docs/step-3-plan.md`.
Steps 1, 2, 2b merged. Step 3 plan commits 1 and 2 done; commit 3 (password policy) in progress. The site runs on OGSERC's VPS
as a closed preview of `main` (D-054). Dependabot PRs (Payload group, minor-and-patch group) are open against `main`, untouched.

## Done 2026-10-28 and 29: first deploy (on `main`)
| Commit | What | CI (owner's report) |
|---|---|---|
| `fa2ff9e` | Next.js 16.4.3 (two critical unauthenticated RCEs in 16.4.0), undici, dompurify, zod overrides; happy-dom ignore (D-012) | green (PR #19) |
| `babe3e9` | `.gitleaksignore` for the fake test JWT brought to `main` (CI fetches every branch, so every PR failed) | green (PR #19) |
| `51651bb` | `docker-compose.prod.yml` (app, PostgreSQL 17, Caddy 2.11.7), Caddyfile closing `/admin` and `/api`, noindex, short HSTS; nightly `pg_dump`; RUNBOOK (D-054) | green (PR #20) |
| `22564e8`, `16992b2` | `@img/sharp-wasm32` fallback (D-055, did not fix the VPS); RUNBOOK corrected from the first server setup | green (PR #22) |
| `71b2b36` | `IMAGE_PROCESSING=off`: Payload without sharp, images unoptimised; CI job proves it with every sharp binary blocked (D-056) | green (PR #23) |

**Live:** `https://ogserc.org.ng` on the Truehost VPS (102.203.117.9, AlmaLinux 8.10), user `deploy`, code in `/opt/ogserc`.
Checked from outside on 2026-10-28/29: homepage 200, Let's Encrypt certificate to 2027-01-26, http and `www` redirect, `/admin`,
`/api`, login and GraphQL 404, noindex, security headers, images served directly, SSH key-only (no password, no root).
Firewall: ssh, http, https, 443/udp. Automatic security updates. Backups nightly at 02:15 to `/var/backups/ogserc` (14 days).
Email stays on Microsoft 365 (only the `A` record points at the VPS). Deploy: merge to `main` with CI green, then
`ssh deploy@102.203.117.9 "cd /opt/ogserc && git pull --ff-only && docker compose -f docker-compose.prod.yml up -d --build"`.

## Done 2026-10-29 on this branch
| Commit | What | CI |
|---|---|---|
| `0e2d4ab` | Password policy on reset-password (`beforeOperation` hook) and `tests/support/password-probe.ts`: **work in progress, no test calls them yet** | not yet run |
| `6c5cb12` | Merge `main` into Step 3: `portalConfig` loads sharp itself unless `IMAGE_PROCESSING=off`; CI keeps both image checks; D-054 to D-056 after D-052 | not yet run |
| (this) | This file | not yet run |

Earlier commit-3 work, already pushed: `583322c` common-passwords list, `bc81927` policy on create, update and first user,
`d6700d2` no bulk password change. Lint, typecheck and 194 unit tests pass after the merge.

## Open PR from `main` (in the `C:\code\ogserc-next-update` worktree)
`fix/audit-2026-10-29`: `e4178f4` ignores two advisories published on 2026-10-29 that nothing in the site reaches (happy-dom SSRF,
graphql-scalars ReDoS; D-012). Until it is merged, **every PR fails the audit**, this branch included. `de47352`: RUNBOOK closes
password logins with a restart (a reload did not apply it on the VPS) and checks from outside.

## Waiting on the owner
- Push `fix/audit-2026-10-29`, open its PR, merge when green; then merge `main` into this branch again.
- Push this branch (draft PR #16 then shows no conflicts).
- Remove the worktree when its PR is merged: `git worktree remove C:\code\ogserc-next-update`.
- **Unsaved work at sign-out (open, decide before Step 4).** Seen 2026-10-20 with a temporary 5-minute token. The admin refreshes
  the token only on a page change in its last 2 minutes, otherwise shows "Stay logged in" 1 minute before the end, then forces a
  page change to the inactivity page. Separately, the 12-hour limit (4582f40) refuses the refresh and signs out with no warning.
  Either can discard unsaved work in a long form. Before Step 4: test it with a filled-in form, then choose between a longer token
  (for example 4 hours; the owner leans this way for now), a refresh mechanism, or autosave or draft recovery. In D-052.
- How the admin panel shows the last-administrator 409 (for example demoting the last administrator from the edit screen): not
  yet seen.
- Private files for draft documents, before Step 4 (D-045). **Undecided.** Leaning: Media for public images only;
  document files in their own upload collection whose read access follows the document's published status.
- Dependabot Payload PR: re-check the D-051 boot instance and the D-052 "Watch" list before merging. Payload 3.92.1 ships undici
  7.30.1, so the undici override can go then (D-012).

## Waiting on Truehost / OGSERC
- **Truehost: VM CPU type "host" or "x86-64-v2"** (ticket open). Then `grep -cw sse4_2 /proc/cpuinfo` > 0: remove
  `IMAGE_PROCESSING=off` from the VPS `.env`, redeploy, and follow D-056's undo list (RUNBOOK Section 11).
- **Off-server backups:** suggested an S3-compatible bucket in an OGSERC-owned account (Cloudflare R2 or Backblaze B2), uploaded
  nightly with `rclone` and a write-only key; also the storage Step 4 needs. Needs: who owns the account, and whether data may
  be stored outside Nigeria. Until then, copy the dumps weekly with `scp`.
- PDF size limit (25 MB ceiling until then); audit-log IP retention (NFR-SEC-19); homepage review; real content.
- Photo licences; permission for the Ogun State crest; confirmation that OGSERC owns the logo; legal advice on
  hosting personal data outside Nigeria, before Phase 2. Microsoft 365 DKIM for the domain is not set up (step 13).

## Then the remaining Step 3 plan commits
3. Finish the password policy: reset-path database tests (REST reset form with an issued token, and the trusted-code probe),
   D-053, the plan updated (a `beforeOperation` hook instead of a replacement endpoint), then HIBP.
4. Rate limiting (also limits the 15-minute lockout that anyone can trigger on a known staff email; D-052).
5. Audit log (also records `pnpm auth:unlock`).
6. 2FA (payload-totp, guards, admin reset, emergency CLI). Re-test Strict cookies with it (D-052).
7. Email adapter.
8. Auth e2e tests.
9. Docs.
When Step 3 is merged: reopen `/admin` in `deploy/Caddyfile` (D-054, RUNBOOK Section 11).

## Notes
- Never compare an error's `name` or class (CLAUDE.md, D-051). The login reply is decided by endpoint and status (D-052).
- The database tests run on a hosted database and this machine's connection drops at times (several runs on 2026-10-20 and 21
  failed with `ENOTFOUND`, `ECONNRESET` or a reset that never confirmed). The harness refused to continue each time; re-run.
- Locally, `pnpm test:unit` with its default `line` reporter sometimes prints nothing when piped, though it exits 0. Count
  results with `--reporter=list` (CI uses `list`).
- `pnpm test:e2e:db --project=first-user --project=<name> --no-deps` runs one project quickly.
- `payload.config.ts` loads sharp only when it is used (D-056), so a host where sharp cannot load no longer fails the build;
  `/admin` and `/api` fail on first use instead.
- Server commands: the owner runs them over SSH and pastes the output; give one labelled block at a time.

## Step 4 notes
- Hide admin controls that return 403 for editors (e.g. Publish on published documents).
- Add one real HTTP test of the draft rules on a real content collection.
- Watch the drafts test's second `payload run` in CI (time, silent exits: D-047).
- Local database tests are slow on the hosted test database (3-9 s per request; some 30 s timeouts).
  A Payload CLI command that exits quickly and silently did not run (D-047, D-051). Use `pnpm migrate`, never
  `pnpm payload migrate`.
- The S3 storage adapter (D-013) and off-server backups could share one provider.

## Exact next step
The owner asked on 2026-10-29 to work on user-interface changes next. Do them on a new branch from `main` (they are not Step 3),
after `fix/audit-2026-10-29` is merged so CI can pass. Then return here: Step 3 plan commit 3, the reset-path tests.
