# Project status

Updated 2026-10-20. Branch `feat/step-3-users-roles`, draft PR #16 (stays a draft), plan `docs/step-3-plan.md`.
Steps 1, 2, 2b merged. Step 3 groups A, B, C and D done. Dependabot PRs #17 and #18 are open against `main`, untouched.

## Done this session (commits 3 to 7 of the review round)
| Commit | What | CI |
|---|---|---|
| `70bcf60` | 3. CLAUDE.md Local API rule; D-049 (allowAll list, content saving, non-atomic note) | green |
| `f680ca3` | 4a. `describeDatabase` and the schema check move to `src/lib/db`; secret-free description tests | green (with b3eb2b4) |
| `0c2c10a` | 4b. `pnpm db:verify`: read-only post-migration check, in CI after migrate (D-051 part 1) | green (with b3eb2b4) |
| `a47ddb1` | 4c. Startup check at boot, retry of an unreachable database, `disableCreateDatabase`, CI startup steps (D-051 part 2) | red: db:verify found `ogserc` empty |
| `7c2a685` | `pnpm migrate` confirms itself; `payload migrate` had exited 0 without applying (D-051 part 3) | red: one media test |
| `8445b06` | The boot check uses its own Payload instance; the shared one broke error details (D-051 part 4) | red: test asserted the minified error name |
| `b3eb2b4` | The test asserts error details, not the name (minified to "A") | **green, all four jobs** |
| `f97b6c9` | CLAUDE.md: never compare error or constructor names | not yet run |
| `027fadb` | D-051: the boot instance depends on Payload 3.90.2 internals; re-check after upgrades | not yet run |
| `30332d2` | CLAUDE.md: no in-memory state shared between startup code and route handlers | not yet run |
| `810ae69` | 5. Tests: administrators create accounts by email (lower-cased, sign-in, duplicates refused); first-user email | not yet run |
| `6ffc2f8` | 6. CLAUDE.md: no screenshots of terminals, dashboards, settings, secrets or personal data | not yet run |
| (this) | 7. CLAUDE.md: update STATUS.md each session; commands list; this file | not yet run |

`pnpm db:verify` against the dev database (ep-broad-river, neondb), 2026-10-19: read-only session confirmed, 10 tables and
3 migrations present, nothing missing. The two test-only tables exist too, but are not expected with the test flag off.

## Waiting on the owner
- CI result for this push (commits f97b6c9 to commit 7).
- Check every tracked image (list given on 2026-10-20), especially:
  - `docs/reference/screencapture-laserc-ng-login-*`;
  - the two `…-user-profile-*` captures, which may show a signed-in name or email.
- Private files for draft documents, before Step 4 (D-045). **Undecided.** Leaning: Media for public images only;
  document files in their own upload collection whose read access follows the document's published status.
- Dependabot PR #17 (Payload upgrade): re-check the D-051 boot instance before merging.
- **Unsaved work at sign-out (open, decide before Step 4).** Seen 2026-10-20 with a temporary 5-minute token. The admin refreshes
  the token only on a page change in its last 2 minutes, otherwise shows "Stay logged in" 1 minute before the end, then forces a
  page change to the inactivity page. Separately, the 12-hour limit (4582f40) refuses the refresh and signs out with no warning.
  Either can discard unsaved work in a long form. Before Step 4: test it with a filled-in form, then choose between a longer token
  (for example 4 hours; the owner leans this way for now), a refresh mechanism, or autosave or draft recovery. Goes in D-052.

## Waiting on OGSERC
- PDF size limit (25 MB ceiling until then); audit-log IP retention (NFR-SEC-19); homepage review; real content.
- Photo licences; permission for the Ogun State crest; confirmation that OGSERC owns the logo; legal advice on
  hosting personal data outside Nigeria, before Phase 2.

## Then the remaining Step 3 plan commits
1. Users hardening (last administrator, lockout, cookies, CSRF, sessions).
2. Password policy + HIBP.
3. Rate limiting.
4. Audit log.
5. 2FA (payload-totp, guards, admin reset, emergency CLI).
6. Email adapter.
7. Auth e2e tests.
8. Docs.

The lockout-message rewrite (`afterError`) must not compare error names (CLAUDE.md).

## Step 4 notes
- Hide admin controls that return 403 for editors (e.g. Publish on published documents).
- Add one real HTTP test of the draft rules on a real content collection.
- Watch the drafts test's second `payload run` in CI (time, silent exits: D-047).
- Local database tests are slow on the hosted test database (3-9 s per request; some 30 s timeouts).
  A Payload CLI command that exits quickly and silently did not run (D-047, D-051). Use `pnpm migrate`, never
  `pnpm payload migrate`.

## Exact next step
Read the CI result for this push and fix anything red. Then start Step 3 plan commit 2, the Users hardening:
- last-administrator rule under an advisory lock;
- lockout with the generic message;
- cookies `Secure` and `SameSite=Strict`;
- `csrf: [SITE_URL]`;
- 1-hour idle and 12-hour absolute sessions;
- sessions revoked on password or role change.

Read `docs/step-3-plan.md` "Users collection" first and propose the plan.
