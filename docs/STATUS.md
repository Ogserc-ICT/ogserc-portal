# Project status

Updated 2026-10-18. Branch `feat/step-3-users-roles`, draft PR #16 (stays a draft), plan `docs/step-3-plan.md`.
Steps 1, 2, 2b merged. Step 3 groups A, B, C done (CI green on 50980e9).

## Done this session (group D, part 1)
- `60cdd70` STATUS.md: PR #16, OGSERC's open items, draft-files leaning.
- `f5f3694` Test-only `e2e-drafts` collection (flag `E2E_TEST_COLLECTIONS`, refused in production) and migration
  `20261018_173528_e2e_drafts` (applied to dev); flag allow-list test; config audited with and without it (D-050).
- `6b02e5f` Only `migrate:create` sets the flag; `generate:types` does not.
- `d7a2e42` `guardPublishedContent` hook: editors cannot change, unpublish, restore over or duplicate published
  content. 35 drafts cases (Local API and Payload's REST pipeline); REST ignores `overrideAccess`; audit rule.
- `5201b8d` Test-collection runs never rewrite `payload-types.ts`; deployed types restored.

## Still to do in this round, in order
3. CLAUDE.md Local API rule + D-049 (`allowAll` list, group D results, the hook, check-then-write not atomic).
4. `pnpm db:verify` post-migration check in CI and the RUNBOOK (D-051); run it against dev.
5. Tests: an administrator creates a user with an email; first-user email stored as submitted.
6. CLAUDE.md: no screenshots of terminals, dashboards, settings or secrets; check each image before committing.
7. CLAUDE.md rule to update STATUS.md each session; update STATUS.md. (CI artifact retention: already 7 days.)

## Then the remaining Step 3 plan commits
Users hardening (last administrator, lockout, cookies, CSRF, sessions); password policy + HIBP; rate limiting;
audit log; 2FA (payload-totp, guards, admin reset, emergency CLI); email adapter; auth e2e tests; docs.

## Waiting on the owner
- CI result for this push. Private files for draft documents, before Step 4 (D-045). **Undecided.** Leaning: Media for public images only;
  document files in their own upload collection whose read access follows the document's published status.

## Waiting on OGSERC
- PDF size limit (25 MB ceiling until then); audit-log IP retention (NFR-SEC-19); homepage review; real content.
- Photo licences; permission for the Ogun State crest; confirmation that OGSERC owns the logo; legal advice on
  hosting personal data outside Nigeria, before Phase 2.

## Step 4 notes
- Hide admin controls that return 403 for editors (e.g. Publish on published documents).
- Add one real HTTP test of the draft rules on a real content collection.
- Watch the drafts test's second `payload run` in CI (time, silent exits: D-047).
- Local database tests are slow on the hosted test database (3-9 s per request; some 30 s timeouts).
  A Payload CLI command that exits quickly and silently did not run (D-047), `pnpm migrate` included.

## Exact next step
Read the CI result for the push of 5201b8d + STATUS, fix anything red, then commit 3 (CLAUDE.md + D-049).
