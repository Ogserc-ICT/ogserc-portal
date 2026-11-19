# Project status

Updated 2026-11-19. Plan for Step 3: `docs/step-3-plan.md`.

## Where things stand
- **Steps 1, 2 and 2b** are merged. The live preview at `https://ogserc.org.ng` runs on OGSERC's VPS (D-054), with
  real content added through `content/*` branches since 2026-10-29, Umami statistics (D-077), search engine indexing (D-078),
  a server log report with disk and backup alerts (D-079) and encrypted off-server backups to Backblaze B2 (D-080; first copy
  and restore test passed 2026-11-19).
- **Step 3 is partly on `main`.** The owner merged draft PR #16 on 2026-11-19 (`5b6cded`): plan commits 1 and 2 and most of
  commit 3. The VPS has **not** been deployed since, so it still runs the code from before that merge.
- **Branch `feat/step-3-password-reset`, draft PR #51:** finishes commit 3 apart from the breach check: reset-link and
  trusted-code tests (`tests/e2e-db/password-policy.spec.ts`), D-053, and this file.

## Before the next deploy (any deploy now includes Step 3 so far)
- The server's `PAYLOAD_SECRET` must be at least 32 characters, or the app refuses to start. Owner to check its length
  (`awk` on `/opt/ogserc/.env`, printing only the length) and replace it if shorter.
- On first start, Payload creates its tables in the live database (migrations run at boot). Afterwards rerun
  `deploy/test-restore.sh`, which then checks the site database in full.
- `/admin` and `/api` stay closed in the Caddyfile until Step 3 is complete (D-054, RUNBOOK Section 11).

## Remaining Step 3 plan commits
3. Breach check (Have I Been Pwned range API, k-anonymity, fail-open with a warning, `PASSWORD_BREACH_CHECK=off` in CI), with
   built-in `fetch` and `crypto` only.
4. Rate limiting (also limits the 15-minute lockout that anyone can trigger on a known staff email; D-052).
5. Audit log (also records `pnpm auth:unlock`).
6. 2FA (payload-totp, guards, admin reset, emergency CLI). Re-test Strict cookies with it (D-052).
7. Email adapter.
8. Auth e2e tests.
9. Docs.
When Step 3 is complete: reopen `/admin` in `deploy/Caddyfile`.

## Waiting on the owner
- **Unsaved work at sign-out (decide before Step 4).** Seen 2026-10-20 with a temporary 5-minute token. The admin refreshes
  the token only on a page change in its last 2 minutes, otherwise shows "Stay logged in" 1 minute before the end, then forces a
  page change to the inactivity page. Separately, the 12-hour limit (4582f40) refuses the refresh and signs out with no warning.
  Either can discard unsaved work in a long form. Before Step 4: test it with a filled-in form, then choose between a longer token
  (for example 4 hours; the owner leans this way for now), a refresh mechanism, or autosave or draft recovery. In D-052.
- How the admin panel shows the last-administrator 409 (for example demoting the last administrator from the edit screen): not
  yet seen.
- Private files for draft documents, before Step 4 (D-045). **Undecided.** Leaning: Media for public images only;
  document files in their own upload collection whose read access follows the document's published status.
- Dependabot PRs #17 (Payload group) and #38 (minor-and-patch): re-check the D-051 boot instance, the D-052 and D-053 "Watch"
  lists before merging #17. Payload 3.92.1 ships undici 7.30.1, so the undici override can go then (D-012).
- The image "option A" decision (pre-optimise images while the VPS lacks SSE4.2; revisit hosting before launch) is still to be
  recorded as D-081.
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
- Hide admin controls that return 403 for editors (e.g. Publish on published documents).
- Add one real HTTP test of the draft rules on a real content collection.
- Watch the drafts test's second `payload run` in CI (time, silent exits: D-047).
- The S3 storage adapter (D-013) could use the same Backblaze account as the off-server backups (D-080), with its own bucket and key.

## Exact next step
Merge PR #51 when its CI is green. Then the breach check (plan commit 3, last part) on a new branch from `main`.
