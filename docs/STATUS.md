# Project status

Updated 2026-10-18. Branch `feat/step-3-users-roles`; draft PR #16 open (stays a draft). Plan: `docs/step-3-plan.md`.

## Done
- Build steps 1, 2 and 2b merged to `main` (scaffold, CI, design system, homepage, motion, back to top; PR #15).
- Step 3 so far: roles, capabilities and deny-by-default access (plan commit 1); startup checks, config-access
  audit test, REST caps (review B); test database isolation and one first administrator (D-044, D-047);
  Media uploads (review A, D-045); Users hardening tests (review C, D-048). CI green on 50980e9.

## In progress
- Step 3 review round, group D: `canSaveContent` test and the Local API rule (CLAUDE.md, DECISIONS D-049).

## Exact next step
Add a test-only drafts collection (pulled forward from plan commit 8), test `canSaveContent`
(`src/access/index.ts:66`) through the Local API, and add a `beforeChange` guard only if the test shows a bypass.

## Remaining in Step 3 (plan commits 2-9)
Users hardening; password policy and HIBP; rate limiting; audit log; 2FA; email adapter; auth e2e tests; docs.

## Waiting on the owner
- Draft files (Step 4, D-045): **undecided.** Owner's leaning: Media for public images only; document files get their
  own upload collection whose read access follows the document's published status.

## Waiting on OGSERC
- PDF and document size limit (only the 25 MB ceiling applies until then).
- IP retention period for the audit log (NFR-SEC-19).
- Homepage review from step 2 and real content (all content is "[Sample, OGSERC to supply]").
- Licences for the photos used on the site.
- Permission to use the Ogun State crest, and confirmation that OGSERC owns the logo.
- Legal advice on hosting personal data outside Nigeria, before Phase 2.

## Watch
- A Payload CLI command that exits quickly and silently did not run (D-047).
- Adding `proxy.ts` caps request bodies at 10 MB unless raised (D-045).
