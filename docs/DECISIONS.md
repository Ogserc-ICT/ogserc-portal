# Technical decisions

Records major technical choices and the reasons for them (NFR-OPS-04). Newest entries go at the bottom. When a decision is reversed, add a new entry rather than editing the old one.

Each entry: **Decision**, **Why**, and where useful **Trade-off** and **Revisit when**.

---

## D-001 Core stack: Next.js, Payload CMS, PostgreSQL, Tailwind (2026-10-08)

**Decision:** Next.js (App Router, TypeScript strict) with Payload CMS running inside the same app, PostgreSQL through Payload's Postgres adapter, and Tailwind CSS.

**Why:** Specified in the SRS (Section 2.3) and CLAUDE.md. Payload running inside Next.js means one application to host and back up rather than a separate CMS server. All parts are open source and run on any Node.js host, which supports the no-lock-in rule.

## D-002 Versions: Next.js 16.4, Payload 3.90.2, all dependencies pinned exactly (2026-10-08)

**Decision:** Next.js 16.4.0 and Payload 3.90.2 (newest of each at scaffold time). Every dependency is pinned to an exact version (no `^` ranges), and `pnpm-lock.yaml` is committed.

**Why:** Payload 3.90.2 officially supports Next.js 16.3.3 and later 16.x. Exact pins mean every install (developer machine, CI, Docker) gets identical code; updates arrive as reviewable Dependabot pull requests instead of silently. All `payload` and `@payloadcms/*` packages must share one version, so Dependabot updates them as a group.

## D-003 Project scaffolded from Payload's official blank template (2026-10-08)

**Decision:** The project was created from Payload's `templates/blank` folder at tag `v3.90.2`, copied directly from Payload's GitHub repository, then switched from MongoDB to PostgreSQL by hand.

**Why:** The `create-payload-app` tool requires an interactive terminal and would not run in the automated environment. Its output is a copy of the same template folder plus the database swap, so the result is equivalent. Template parts we do not use were left out: Vitest (see D-006), the example custom route, editor settings, and `.npmrc` (`legacy-peer-deps=true`, which hides dependency conflicts).

## D-004 ESLint 9.39.5, not ESLint 10 (2026-10-08)

**Decision:** Pin ESLint to 9.39.5, the latest 9.x release.

**Why:** ESLint 10.12.0 was tried first. Lint ran and, on a probe file with deliberate accessibility, React, and Next.js violations, reported exactly the same problems as ESLint 9, so no rules were being skipped. However, three plugins that `eslint-config-next` uses do not declare ESLint 10 support, even in their latest releases:

| Plugin | Latest version | Supported ESLint |
|---|---|---|
| `eslint-plugin-jsx-a11y` (accessibility rules) | 6.10.2 | up to 9 |
| `eslint-plugin-react` | 7.37.5 | up to 9.7 |
| `eslint-plugin-import` | 2.32.0 | up to 9 |

Working today does not guarantee these unsupported plugin/ESLint pairings stay correct, and accessibility linting matters too much for WCAG 2.1 AA to run on an unsupported combination. With ESLint 9, `pnpm install` reports no peer-dependency warnings.

**Trade-off:** npm marks ESLint 9 as no longer supported. ESLint is a development tool only; it is not part of the website, so this carries no risk for site visitors.

**Revisit when:** those three plugins publish releases that declare ESLint 10 support (Dependabot will surface the updates).

## D-005 TypeScript 5.9.3, not 6 or 7 (2026-10-08)

**Decision:** TypeScript 5.9.3, the latest 5.x.

**Why:** TypeScript 6 and 7 are major releases (7 is a rewrite of the compiler). Payload and Next.js are tested against 5.x. Move up when both projects state support.

## D-006 Playwright only; no unit-test framework (2026-10-08)

**Decision:** Removed the template's Vitest setup. All automated tests are Playwright end-to-end tests, with `@axe-core/playwright` for accessibility checks.

**Why:** The stack specifies Playwright, and one test tool is simpler to maintain. The site is mostly content pages, which end-to-end tests cover well. axe is the standard engine for automated WCAG checks (NFR-OPS-02). Tests run at 360px (mobile first) and desktop widths.

**Revisit when:** we add logic that is easier to test in isolation (for example the tariff lookup calculation in step 7).

## D-007 GraphQL API disabled (2026-10-08)

**Decision:** Payload's GraphQL API and playground are switched off; the site uses Payload's local API (server-side) and REST API.

**Why:** Nothing needs GraphQL. Turning it off removes a public endpoint that would otherwise need its own access-control and rate-limit review.

## D-008 Database changes only through committed migration files (2026-10-08)

**Decision:** Payload's automatic schema "push" is turned off in every environment. Every schema change is a migration file in `src/migrations/`, created with `pnpm migrate:create <name>` and committed. In production, pending migrations run automatically when the server starts (Payload `prodMigrations`).

**Why:** CLAUDE.md requires schema changes in committed migrations. With push turned off, the development database always matches what production will get, and any host can rebuild the database from the repository. Running migrations at startup means a deploy cannot leave the code and database out of step.

**Trade-off:** after changing a collection, developers must run `pnpm migrate:create` and `pnpm migrate` before the change appears locally.

## D-009 Site URL read at run time (`SITE_URL`), not `NEXT_PUBLIC_SITE_URL` (2026-10-08)

**Decision:** The site's public address comes from `SITE_URL`.

**Why:** Next.js copies any `NEXT_PUBLIC_*` variable into the build itself, so the same build could not move to a different domain or host. A plain variable is read when the server starts, so one Docker image works anywhere (portability rule: no hard-coded domains).

## D-010 Standalone output only for the Docker build (2026-10-08)

**Decision:** The Dockerfile sets `NEXT_OUTPUT=standalone`, which makes Next.js produce a small self-contained server. Other builds (local, CI, Vercel) use the normal output and `next start`.

**Why:** Standalone output keeps the Docker image small, but `next start` does not support it. Switching it on only in Docker lets both paths work. CI builds the Docker image on every pull request, so the Docker path is checked even though it is not run day to day.

The Docker build uses placeholder `DATABASE_URL` and `PAYLOAD_SECRET` values so the configuration loads. These are not secrets and nothing connects to a database during the build. Real values are passed when the container starts. If a future page needs database content at build time, it must be rendered on demand instead.

## D-011 Security headers now; strict Content-Security-Policy in build step 12 (2026-10-08)

**Decision:** Every response carries Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options (SAMEORIGIN), Referrer-Policy, and Permissions-Policy from step 1, and the `X-Powered-By` header is removed. A strict Content-Security-Policy (CSP) is a separate task in build step 12.

**Why:** These headers are simple and cannot break anything, so there is no reason to wait (NFR-SEC-05). A strict CSP lists exactly which scripts, styles, and connections the browser may load. Payload's admin panel, analytics, maps, and Turnstile all need specific allowances, so it can only be tuned and tested once those parts exist. Shipping it too early would either break the admin panel or be so loose it adds nothing. X-Frame-Options is SAMEORIGIN rather than DENY so Payload's live preview can show our own pages in a frame.

## D-012 Dependency audit fails CI on high and critical only (2026-10-08)

**Decision:** CI runs `pnpm audit --audit-level high`. Low and moderate findings do not block merging; Dependabot proposes their fixes.

**Why:** Blocking on every low-severity finding would stall work on issues that often have no fix yet. High and critical findings must be fixed or explicitly justified before merging (NFR-SEC-11).

At scaffold time:

- `sharp` was upgraded to 0.35.5 (fix for a high-severity image-library flaw).
- `undici` is forced to 7.29.1 with a pnpm override, because Payload 3.90.2 pins the vulnerable 7.29.0. **Remove the override** once a Payload release ships 7.29.1 or later.
- Advisory **GHSA-vfj7-8cjw-p6xm** (`braces`, stack exhaustion from deeply nested glob patterns) is ignored in `package.json` (`pnpm.auditConfig.ignoreGhsas`). No patched version exists. It is only reached through the ESLint tooling with patterns we write ourselves, never from the website or user input. **Remove the ignore** when a fix is released.

## D-013 File storage adapter added in build step 4 (2026-10-08)

**Decision:** The S3-compatible storage adapter is wired up with the Media collection in step 4. Step 1 only adds its variables to `.env.example`.

**Why:** It belongs with the collection that uses it. Until then, nothing is uploaded except test files in development.

## D-014 Payload telemetry disabled (2026-10-08)

**Decision:** `telemetry: false` in the Payload config, and `NEXT_TELEMETRY_DISABLED=1` in Docker.

**Why:** A government site should not send usage data to third parties it has not chosen.

## D-015 Keep Next.js's AGENTS.md; CLAUDE.md and the SRS take precedence (2026-10-08)

**Decision:** `AGENTS.md` stays committed. CLAUDE.md (Conventions) tells AI coding assistants to consult the Next.js docs bundled in `node_modules/next/dist/docs/` before writing Next.js code. If `AGENTS.md` ever conflicts with `CLAUDE.md` or `docs/SRS.md`, `CLAUDE.md` and the SRS take precedence.

**Why:** Next.js 16 writes `AGENTS.md` on every `pnpm dev` (`node_modules/next/dist/server/lib/generate-agent-files.js`). Leaving it uncommitted would leave the working tree permanently dirty, and deleting it is pointless because it comes back. Its advice is useful: Next.js 16 changed APIs that AI assistants may not know, and the bundled docs match the exact installed version. Because the file is generated by a third party and can change when Next.js is upgraded, the project's own rules must win in any conflict.

**Revisit when:** a Next.js upgrade changes the content of `AGENTS.md`. Review the diff in the Dependabot pull request before merging.

## D-016 Remove `baseUrl` from tsconfig.json (2026-10-08)

**Decision:** `compilerOptions.baseUrl` is removed from `tsconfig.json`. The `paths` aliases (`@/*` → `./src/*` and `@payload-config` → `./src/payload.config.ts`) stay. `ignoreDeprecations` is not used.

**Why:** TypeScript has deprecated `baseUrl`, and it stops working in TypeScript 7. Silencing the warning with `ignoreDeprecations` would only postpone the problem. Without `baseUrl`, TypeScript resolves `paths` entries relative to `tsconfig.json`, and ours already start with `./`, so they point to the same files as before. No import relied on `baseUrl` alone (for example `collections/Users` without a prefix).

**Checked:** with temporary probe imports through `@/*` in a public page and in the Payload config, `pnpm typecheck`, `pnpm lint`, `pnpm build` (Next.js/Turbopack), the Payload CLI (`migrate:status`, `generate:importmap`) and `pnpm test:e2e` all passed. The probe text appeared in the built page. Pointing the probe at a missing file made the typecheck fail, which shows the alias is really being resolved. The probes were then removed and the full suite passed again. The existing `@payload-config` imports in the admin and API routes resolve in the same build.

**Rule from now on:** import from `src/` with `@/…` (or a relative path), never with a bare folder name such as `collections/…`.

## D-017 Accounts and repository need not be in OGSERC's name (2026-10-08)

**Decision:** The SRS no longer requires hosting, domain, database, service accounts, or the code repository to be registered in OGSERC's name. They may be held under whichever accounts the developer and OGSERC choose, and the repository may be a private repository under the developer's own GitHub account. In place of ownership, the SRS now requires that account access and recovery steps be recorded in `docs/RUNBOOK.md`, and that more than one trusted person can administer each account where practical.

**Changed in `docs/SRS.md`:** Section 2.2 (constraints), NFR-SEC-14 (domain security: registrar lock and two-factor stay, the ownership clause is removed), NFR-OPS-01 (repository), NFR-HOST-01 (accounts), acceptance criteria 7 and 10, and open item 9.

**Why:** Project owner's decision (2026-10-08). The security controls that protect the accounts (two-factor authentication, registrar lock, DNSSEC, protected main branch, secret scanning) are unchanged; only the requirement about whose name the accounts are in was removed.

**Trade-off:** If accounts are held by one person, access depends on that person. The runbook must therefore record how to access, recover, and transfer each account, so the site can still be moved or maintained by someone else.

## D-018 Repository stays under the developer's account; account recovery documented (2026-10-09)

**Decision:** Follows D-017. The repository stays under the `thekamiyeoladipo` GitHub account, which owns every file in `.github/CODEOWNERS`. The repository documentation no longer assumes it will move to an OGSERC organisation. `docs/RUNBOOK.md` gains Section 9, "Account access and recovery": an account register (GitHub, hosting, database, domain registrar, DNS/CDN, file storage, email sending, receiving mailbox, monitoring, analytics, and the payment provider for Phase 3), with placeholders for account holders, administrators, and where credentials are stored, plus recovery and move steps for each account. NFR-SEC-14 in the SRS is reworded for readability; its meaning is unchanged.

**Why:** Once ownership is no longer required (D-017), the SRS requires that access and recovery steps be recorded instead (Section 2.2, NFR-HOST-01, acceptance criterion 7). The register uses placeholders only: no passwords, keys, or recovery codes are kept in the repository (NFR-SEC-10).

**Consequence to check:** on a private repository under a personal account, GitHub branch protection and secret scanning may need a paid plan or add-on. RUNBOOK Section 2 asks for this to be confirmed. If either is unavailable, record the alternative here.

## D-019 Safeguards for a private repository on GitHub's free plan (2026-10-09)

**Decision:** No branch protection rule is created. On GitHub's free personal plan, branch protection is not enforced and secret scanning is not offered for private repositories. Instead:

1. **Rule:** nothing is pushed directly to `main`. Every change goes through a pull request and is merged only when all CI checks are green. This is documented in `docs/RUNBOOK.md` §2, the README, and the pull request template.
2. **Local pre-push hook:** `scripts/git-hooks/pre-push`, installed with `pnpm hooks:install` (sets `core.hooksPath`), refuses any push whose remote ref is `refs/heads/main`. That covers `git push origin main`, `git push origin HEAD:main`, and deleting `main`. Tested by feeding the hook simulated pushes (to a branch, to `main`, `HEAD:main`, deleting `main`, a branch called `main-fix`, a tag) and by `git push --dry-run` from a temporary branch: blocked for `main`, allowed for other branches, skipped with `--no-verify`.
3. **Claude Code project settings:** `.claude/settings.json` adds `permissions.deny` rules for `git push` commands aimed at `main` (`… main`, `… *:main`, `… *:refs/heads/main`, with or without trailing options), for both the Bash and PowerShell tools. Claude Code's documentation (code.claude.com/docs/en/permissions and /permission-modes, checked 2026-10-09) states that deny rules are checked before allow rules, block in every permission mode including `bypassPermissions`, and apply to each part of a compound command. Both forms were tested in this repository and refused. `.claude/settings.local.json` is ignored by git.
4. **Secret scanning in CI:** a `Secret scan (gitleaks)` job downloads the gitleaks CLI v8.30.1, checks its SHA-256 checksum, and scans the full commit history. It exits with code 1, failing the check, on any finding, and redacts secrets from the log. Locally, the same version found nothing in the repository's 15 commits, and caught both fake secrets planted in a throwaway test repository (exit code 1).

**Why:**

- **Layers:** the hook and the Claude Code rules stop mistakes before they reach GitHub; the green-check rule and the PR template cover merging, which neither of them can control.
- **The CLI, not the Action:** the gitleaks CLI is MIT-licensed and free for any use. The official `gitleaks/gitleaks-action` has used its own licence since v2: free for personal accounts, but it needs a licence key for organisation accounts. Running the CLI directly avoids that dependency and keeps working if the repository moves.
- **Pinned and checked:** pinning the version and checksum means CI runs exactly the binary that was reviewed.

**Limits:**

- **The hook:** it only runs where `pnpm hooks:install` has been run, and `git push --no-verify` skips it.
- **The Claude Code rules:** they match the command text. The documentation says they are not a security boundary; a form like `git -C . push origin main` is not matched, but the hook catches it.
- **Merging:** nothing technically stops a merge with failing checks. The person merging must wait for green.
- **Upgrades:** Dependabot does not update the pinned gitleaks version, so upgrade it by hand (RUNBOOK §2.4).

**SRS:** NFR-OPS-01 and NFR-SEC-10 are updated to allow these alternatives where the hosting plan lacks the feature.

**Revisit when:** the repository moves to a plan that enforces rulesets and offers secret scanning. Then add a `main` ruleset requiring all four checks, and turn on GitHub secret scanning with push protection. Keep the gitleaks job as a second check.

## D-020 Documentation matches the free-plan safeguards (2026-10-09)

**Decision:** Statements about protecting `main`, blocking merges, and secret scanning now describe what is actually in place (D-019).

- **SRS NFR-OPS-02:** "A failing check blocks merging" becomes "A failing check blocks merging where the hosting plan enforces it; otherwise merging only after every check is green is a documented rule."
- **CLAUDE.md, Workflow item 7:** now lists every CI check (lint, typecheck, dependency audit, build, Playwright with axe, secret scan, Docker build), and says GitHub does not enforce green checks on the current plan, so waiting for green is a rule to follow, not a setting.
- **RUNBOOK §9.3 (GitHub, Move):** no longer assumes rulesets and secret scanning exist. After a transfer: redo §2.5, run `pnpm hooks:install` in any new clone, and turn on rulesets and secret scanning only if the new plan supports them.

**Superseded statements:** older entries are not edited. Where they conflict with D-019, D-019 applies:

- **D-017:** its list of unchanged controls includes "protected main branch" and "secret scanning". On the current plan, these are the D-019 alternatives (rule, pre-push hook, Claude Code deny rules, green CI checks, and gitleaks in CI), not GitHub features.
- **D-018:** its "Consequence to check" is answered. The free plan offers neither feature for private repositories.

**Checked and already accurate:** README (Contributing), `.github/pull_request_template.md`, RUNBOOK §2, SRS NFR-OPS-01 and NFR-SEC-10, and the comments in `scripts/git-hooks/pre-push`.

**Why:** Documents that claim a protection exists when it does not invite people to rely on it, for example merging on the assumption that GitHub would have stopped a failing change.

## D-021 SRS wording matches the CI triggers and package manager (2026-10-09)

**Decision:** Two SRS requirements now describe the CI as it is configured in `.github/workflows/ci.yml`.

- **NFR-OPS-02:** "Automated checks run on every push" becomes "on every pull request and on every push to main". The workflow runs on `pull_request` and on `push` to `main` only. A push to a branch with no open pull request does not run CI.
- **NFR-SEC-11:** "`npm audit` in CI" becomes "`pnpm audit` in CI". The project uses pnpm (D-002), and CI runs `pnpm audit --audit-level high` (D-012).

**Checked:** README, `docs/RUNBOOK.md`, `CLAUDE.md`, and `.github/pull_request_template.md` contain neither inaccuracy, and no other npm, npx, or yarn commands appear in them. No changes were needed there.

**Why:** Keeps the requirements consistent with what the repository actually runs.
