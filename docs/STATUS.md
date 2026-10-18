# Project status

Updated 2026-10-18. Branch `feat/step-3-users-roles` (pushed; no PR yet). Plan: `docs/step-3-plan.md`.

## Done
- Build steps 1, 2 and 2b merged to `main` (scaffold, CI, design system, homepage, motion, back to top; PR #15).
- Step 3 so far: roles, capabilities and deny-by-default access (plan commit 1); startup checks, config-access
  audit test, REST caps (review B); test database isolation and one first administrator (D-044, D-047);
  Media uploads: real images only, 10 MB, content check, publishers replace (review A, D-045);
  Users hardening tests: email changes by administrators only, roles out of the token (review C, D-048).

## In progress
- Step 3 review round, group D: `canSaveContent` test (editor saving a published document, editor setting
  `_status: published`) and the Local API rule (`overrideAccess: false` on public queries) in CLAUDE.md and DECISIONS.

## Exact next step
Write the group D test in `tests/e2e-db/`, run it against the current `canSaveContent` (`src/access/index.ts:66`),
replace it with a `beforeChange` status check if it can be bypassed, then add D-049 (Local API rule and the list of
`allowAll` uses; D-045 already links to D-049, which does not exist yet).

## Remaining in Step 3 (plan commits 2-9)
Users hardening (last administrator lock, lockout, cookies, CSRF, sessions, generic locked message); password policy
and HIBP; rate limiting; audit log; 2FA (payload-totp, guards, admin reset, emergency CLI); email adapter;
auth e2e tests; docs (README, RUNBOOK, CLAUDE.md "Authentication and access", `.env.example`). Then PR, all CI green.

## Waiting on the owner
- Open the PR for this branch when Step 3 is complete (or earlier, if a review checkpoint is wanted).
- Step 4 decision before building Documents: how draft documents' files stay private (D-045 open question).

## Waiting on OGSERC
- PDF and document size limit (only the 25 MB ceiling applies until then).
- IP retention period for the audit log (NFR-SEC-19).
- Homepage review from step 2 and real content (all content is "[Sample, OGSERC to supply]").

## Watch
- A Payload CLI command that exits quickly and silently did not run (D-047).
- Adding `proxy.ts` caps request bodies at 10 MB unless raised (D-045).
