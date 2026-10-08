## What this changes

<!-- One or two sentences. Reference SRS requirement IDs, e.g. FR-DOC-02. -->

## Build step

<!-- Which step of the Phase 1 build order in CLAUDE.md this belongs to. -->

## How it was tested

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test:e2e` (Playwright + axe), with a test added or updated for any user-facing flow
- [ ] Checked at 360px wide

## Security checklist

Required when this touches auth, uploads, forms, or access control. Answer each.

- Input validated on the server?
- Access control enforced on the server?
- Secrets absent from code, logs, and this PR?
- Errors safe (no stack traces or internals shown to users)?
- New dependency justified (and approved)?

## Docs

- [ ] `README.md` / `docs/RUNBOOK.md` updated if setup, deployment, or operations changed
- [ ] `docs/DECISIONS.md` updated if a technical choice was made
