# Project status

Updated 2026-11-23. Plan for Step 3: `docs/step-3-plan.md`.

## Where things stand
- **Steps 1, 2 and 2b** are merged. The live preview at `https://ogserc.org.ng` runs on OGSERC's VPS (D-054), with
  real content added through `content/*` branches since 2026-10-29, Umami statistics (D-077), search engine indexing (D-078),
  a server log report with disk and backup alerts (D-079) and encrypted off-server backups to Backblaze B2 (D-080; first copy
  and restore test passed 2026-11-19).
- **Step 3's security work is merged and deployed** (2026-11-20, `0db390f`): roles, password policy and breach check (D-053),
  rate limits (D-081), audit log (D-083), two-factor sign-in with an administrator reset and an emergency command (D-084).
  On the VPS all six migrations ran, the startup check passed, the audit clean-up cron is installed and dry-run clean, and the
  restore test passed with the full site database (15 tables, 6 migrations).
- **`/admin` is open** (2026-11-23, D-087): both administrators (the owner and a second administrator) signed in through the
  one-address window with two-factor sign-in, the window was closed and checked from outside, then the Caddyfile block was
  removed (PR #64, deployed and checked from outside: `/admin` 200).
- **Step 3 plan commit 3 (password policy) is complete:** PRs #51 and #53 (breach check, fail-open) merged.
- **Step 3 plan commit 4 (rate limiting, D-081):** PR #54 merged.
- **Step 3 plan commit 5 (audit log, D-083):** PR #55 merged.
- **Step 3 plan commit 6 (two-factor sign-in, D-084):** part A merged (PR #56); part B (administrator reset, emergency command) on branch `feat/step-3-two-factor-reset`, PR #57.

## Still to check on the live admin
- The server needs outbound HTTPS to `api.pwnedpasswords.com` for the breach check (D-053); if blocked it is skipped with a
  warning in the app log.

## Remaining Step 3 plan commits
6. Re-test Strict cookies with 2FA in a real browser at the first deploy (D-052).
7. No email (D-085): branch `feat/step-3-no-email`; forgotten passwords are reset by an administrator (RUNBOOK 4.3).
8. Auth e2e tests.
9. Docs.

## Waiting on the owner
- How the admin panel shows the last-administrator 409 (for example demoting the last administrator from the edit screen): not
  yet seen.
- Dependabot PRs #17 (Payload group) and #38 (minor-and-patch): re-check the D-051 boot instance, the D-052 and D-053 "Watch"
  lists before merging #17. Payload 3.92.1 ships undici 7.30.1, so the undici override can go then (D-012).
- The image "option A" decision (pre-optimise images while the VPS lacks SSE4.2; revisit hosting before launch) is still to be
  recorded as D-082.
- `docs/source/OGSERC_Customer_Service_Standards_and_Protection_Regulation_2026.docx` is untracked: probably the next content item.
- How the contact form sends email: OGSERC's Microsoft 365 (SMTP AUTH on one mailbox) or a sending service (D-059).
- OGSERC to confirm: the slide 2 and 3 headlines, the contact page introduction and department descriptions, the weekend
  closure, and the sitemap wording change (D-061) at sign-off.

## Waiting on Truehost / OGSERC
- **Truehost: VM CPU type "host" or "x86-64-v2"** (ticket open). Then `grep -cw sse4_2 /proc/cpuinfo` > 0: remove
  `IMAGE_PROCESSING=off` from the VPS `.env`, redeploy, and follow D-056's undo list (RUNBOOK Section 11).
- PDF size limit (25 MB ceiling until then); audit-log IP retention (NFR-SEC-19); homepage review; real content.
- Photo licences; permission for the Ogun State crest; confirmation that OGSERC owns the logo; legal advice on
  hosting personal data outside Nigeria, before Phase 2. Microsoft 365 DKIM for the domain is not set up (step 13).

## Notes
- Never compare an error's `name` or class (CLAUDE.md, D-051). The login reply is decided by endpoint and status (D-052).
- The server checks the database at startup (D-051), so any CI job that starts the production server needs a database.
- Database tests run in CI on a throwaway Postgres; locally they use the hosted test database, whose connection drops at times
  (`ENOTFOUND`, `ECONNRESET`). Re-run. `pnpm test:e2e:db --project=first-user --project=<name> --no-deps` runs one project.
- Locally, `pnpm test:unit` with its default `line` reporter sometimes prints nothing when piped, though it exits 0. Count
  results with `--reporter=list` (CI uses `list`).
- A Payload CLI command that exits quickly and silently did not run (D-047, D-051). Use `pnpm migrate`, never `pnpm payload migrate`.
- Server commands: the owner runs them over SSH and pastes the output; give one labelled block at a time.

## Step 4 notes
- Owner decisions (D-089): drafts with autosave on every content collection, so work resumes after a sign-out; uploaded
  files (images and documents) stay public, and the staff guide says not to upload anything confidential.
- Hide admin controls that return 403 for editors (e.g. Publish on published documents).
- Add one real HTTP test of the draft rules on a real content collection.
- Watch the drafts test's second `payload run` in CI (time, silent exits: D-047).
- The S3 storage adapter (D-013) could use the same Backblaze account as the off-server backups (D-080), with its own bucket and key.

## Exact next step
Step 4: read SRS for the collections, propose the Step 4 plan (collections, drafts with autosave per D-089, seed script) and
wait for approval.
