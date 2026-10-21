# Project status

Updated 2026-10-21. Branch `feat/step-3-users-roles`, draft PR #16 (stays a draft), plan `docs/step-3-plan.md`.
Steps 1, 2, 2b merged. Step 3 plan commits 1 and 2 done (2 = the Users hardening, this session). Dependabot PRs #17 and #18
are open against `main`, untouched.

## Done this session: Step 3 plan commit 2, Users hardening (D-052)
| Commit | What | CI (owner's report) |
|---|---|---|
| `f881738` | 1-hour token, token only in the HttpOnly cookie, API keys off, `SameSite=Strict`; first-register returns no token | green, all four jobs |
| `407ee4e` | CSRF: only the site's normalised origin; `SITE_URL` must be https in production (localhost excepted) | green (with 4b171f6) |
| `dd502be` | RUNBOOK: production refuses a non-https `SITE_URL` | green (with 4b171f6) |
| `4b171f6` | Lock for 15 minutes after 5 failures; one identical reply for every failed sign-in | green, all four jobs |
| `7a0caf7` | `pnpm auth:unlock <email>` emergency unlock; RUNBOOK 4.1 | green (with 2f171dd) |
| `4582f40` | No session lasts more than 12 hours from sign-in | green (with 2f171dd) |
| `2f171dd` | A change of roles ends every session of that account | green, all four jobs |
| `f346d2c` | STATUS open item: unsaved work at sign-out | green (with 71fa28e) |
| `edf077a` | Nobody deletes their own account | green (with 71fa28e) |
| `71fa28e` | At least one administrator always remains: once per operation, under an advisory lock; concurrent and bulk tests | green, all four jobs |
| (this) | Docs: D-052, RUNBOOK first admin and second administrator, `.env.example` `SITE_URL`, plan, this file | not yet run |

Earlier: `5e54ee4` (end of the previous session) green, all four jobs. The owner checked every tracked image on 2026-10-20:
nothing sensitive.

Checks shown this session, not committed:
- the same-origin CSRF test fails with the raw `SITE_URL` (trailing slash and path);
- without the last-administrator rule, and again with the count but without the lock, two administrators demoting each other
  both got 200, leaving none;
- the admin panel with a temporary 5-minute token (results in D-052).

## Waiting on the owner
- CI result for this push (the docs commit).
- **Unsaved work at sign-out (open, decide before Step 4).** Seen 2026-10-20 with a temporary 5-minute token. The admin refreshes
  the token only on a page change in its last 2 minutes, otherwise shows "Stay logged in" 1 minute before the end, then forces a
  page change to the inactivity page. Separately, the 12-hour limit (4582f40) refuses the refresh and signs out with no warning.
  Either can discard unsaved work in a long form. Before Step 4: test it with a filled-in form, then choose between a longer token
  (for example 4 hours; the owner leans this way for now), a refresh mechanism, or autosave or draft recovery. In D-052.
- How the admin panel shows the last-administrator 409 (for example demoting the last administrator from the edit screen): not
  yet seen.
- Private files for draft documents, before Step 4 (D-045). **Undecided.** Leaning: Media for public images only;
  document files in their own upload collection whose read access follows the document's published status.
- Dependabot PR #17 (Payload upgrade): re-check the D-051 boot instance and the D-052 "Watch" list before merging.

## Waiting on OGSERC
- PDF size limit (25 MB ceiling until then); audit-log IP retention (NFR-SEC-19); homepage review; real content.
- Photo licences; permission for the Ogun State crest; confirmation that OGSERC owns the logo; legal advice on
  hosting personal data outside Nigeria, before Phase 2.

## Then the remaining Step 3 plan commits
3. Password policy + HIBP, and the replacement reset-password endpoint.
4. Rate limiting (also limits the 15-minute lockout that anyone can trigger on a known staff email; D-052).
5. Audit log (also records `pnpm auth:unlock`).
6. 2FA (payload-totp, guards, admin reset, emergency CLI). Re-test Strict cookies with it (D-052).
7. Email adapter.
8. Auth e2e tests.
9. Docs.

## Notes
- Never compare an error's `name` or class (CLAUDE.md, D-051). The login reply is decided by endpoint and status (D-052).
- The database tests run on a hosted database and this machine's connection drops at times (several runs on 2026-10-20 and 21
  failed with `ENOTFOUND`, `ECONNRESET` or a reset that never confirmed). The harness refused to continue each time; re-run.
- Locally, `pnpm test:unit` with its default `line` reporter sometimes prints nothing when piped, though it exits 0. Count
  results with `--reporter=list` (CI uses `list`).
- `pnpm test:e2e:db --project=first-user --project=<name> --no-deps` runs one project quickly.

## Step 4 notes
- Hide admin controls that return 403 for editors (e.g. Publish on published documents).
- Add one real HTTP test of the draft rules on a real content collection.
- Watch the drafts test's second `payload run` in CI (time, silent exits: D-047).
- Local database tests are slow on the hosted test database (3-9 s per request; some 30 s timeouts).
  A Payload CLI command that exits quickly and silently did not run (D-047, D-051). Use `pnpm migrate`, never
  `pnpm payload migrate`.

## Exact next step
Read the CI result for the docs commit and fix anything red. Then Step 3 plan commit 3, the password policy: read
`docs/step-3-plan.md` "Password policy" and the SRS (NFR-SEC-01..07), and propose a plan before writing code:
- minimum 12, maximum 128 characters;
- an offline list of common passwords, and rejection of the email's local part and "ogserc";
- the HIBP range check (k-anonymity, padding, fail-open with a warning, `PASSWORD_BREACH_CHECK=off` for CI);
- enforced on create, update, first user and the replacement `/reset-password` endpoint.
