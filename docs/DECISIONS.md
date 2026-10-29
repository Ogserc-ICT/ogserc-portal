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

Update 2026-10-28, before the first deploy to the VPS:

- `next` and `eslint-config-next` upgraded to 16.4.3: 16.4.0 has two critical unauthenticated remote code execution flaws (image optimisation and `use cache`) and a high Server Action denial of service, all fixed in 16.4.1.
- The `undici` override moves to 7.30.1 (seven advisories in 7.29.x). Payload 3.92.1 ships 7.30.1, so **remove the override** when Payload is upgraded (Dependabot PR #17).
- `dompurify` is forced to 3.4.17 (Payload admin, through `monaco-editor`, which pins 3.4.15) and `zod` to 4.6.6 (ESLint plugin). Both are patch releases of the same minor. **Remove each override** when the package that pulls it in ships the fix.
- Advisory **GHSA-834v-8h66-3h79** (`happy-dom` ESM import alias, code execution) is ignored. The fix is in 21.0.4, a major version that `@lexical/headless` (`^20.9.0`) does not accept. The flaw needs JavaScript evaluation, which happy-dom 20 turns off by default (`enableJavaScriptEvaluation: false`), and Lexical creates its window with the defaults (`new Window()`). **Remove the ignore** when Lexical accepts happy-dom 21.

Update 2026-10-29, two advisories published overnight, both ignored because nothing in the site can reach them:

- **GHSA-c8p4-j97h-3vg8** (`happy-dom` server-side request forgery: `<iframe>` and `<link rel="stylesheet">` in parsed HTML are fetched by default). The fix is in happy-dom 21, which `@lexical/headless` does not accept. happy-dom is only loaded by `@lexical/headless/dom`, which neither Payload's Lexical package (no import of it in `@payloadcms/richtext-lexical/dist`) nor our code uses; the admin editor runs in the browser's own DOM. **Remove the ignore** with the one above. If we ever convert HTML to Lexical on the server, turn off `disableIframePageLoading` and `disableCSSFileLoading` or upgrade first.
- **GHSA-x8rm-f576-gq67** (`graphql-scalars` regular-expression denial of service in the `PhoneNumber` scalar), through `@payloadcms/graphql`, which pins 1.22.2; the fix is 2.0.1, a major version. GraphQL is turned off in our Payload config (`graphQL.disable`), and the VPS proxy closes `/api` too (D-054). **Remove the ignore** when Payload ships graphql-scalars 2.0.1 or later.

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

## D-022 Dependabot: weekly grouped updates, deliberately pinned majors ignored (2026-10-09)

**Decision:** Updates D-002 (exact pins, Dependabot pull requests) and D-012 (dependency audit). `.github/dependabot.yml` now:

- runs every **Monday** for npm, GitHub Actions, and Docker;
- puts all **minor and patch** npm updates (except Payload) into **one weekly pull request** (`minor-and-patch` group, `patterns: ['*']`);
- keeps every **Payload** update (`payload`, `@payloadcms/*`) in one `payload` group, so all Payload packages always move to the same version together;
- puts all **GitHub Actions** updates into one pull request;
- limits open pull requests to **5** for npm, **2** for GitHub Actions, and **2** for Docker;
- **ignores the major versions** listed below.

**Major versions deliberately ignored:**

| Dependency | Pinned at | Major ignored | Reason |
|---|---|---|---|
| `typescript` | 5.9.3 | 6, 7, ... | D-005: Payload and Next.js are tested against TypeScript 5.x; TypeScript 7 is a rewrite of the compiler. |
| `eslint` | 9.39.5 | 10, ... | D-004: `eslint-plugin-jsx-a11y`, `eslint-plugin-react` and `eslint-plugin-import` do not support ESLint 10, and the accessibility rules must run on a supported combination. |
| `@types/node` | 22.x | 23, ... | The type definitions must match the Node.js major we run (Node 22 in `.nvmrc`, CI, and the Dockerfile); newer types would let code use features that Node 22 does not have. |
| `node` Docker image | `22-alpine` | 23, ... | The Node major changes deliberately, together with `.nvmrc`, CI, and `@types/node` (see `docs/RUNBOOK.md` §10), so production never runs a different Node major from development and CI. |

**Why:** Seven separate pull requests arrived in the first week, including major upgrades that contradict D-004 and D-005. Grouping routine updates means one review and one CI run per week. Ignoring pinned majors stops Dependabot proposing upgrades that have already been decided against, while minor and patch fixes for the same packages still arrive.

**Trade-off:** ignored majors never arrive as pull requests, so they are easy to forget. `docs/RUNBOOK.md` §10 sets a review every three months, or sooner when a security notice mentions one of them.

**Not affected:** Dependabot *security* updates (turned on in GitHub settings, RUNBOOK §2.5) are separate from these version-update rules and still open pull requests when a vulnerability fix exists. Majors of packages that are not pinned (for example `cross-env`, `dotenv`) still arrive as individual pull requests within the limit.

**Checked:** the file parses as YAML and validates against the SchemaStore `dependabot-2.0` schema. A copy with a deliberately invalid value was rejected by the same check.

## D-023 Design tokens live only in `globals.css`; default palette off; lint blocks hex colours (2026-10-10)

**Decision:** The project uses Tailwind v4, which has no `tailwind.config` file. Its theme is the `@theme` block in `src/app/(frontend)/globals.css`, and that block is the one place colour values are defined. The theme starts with `--color-*: initial`, which removes Tailwind's default palette (red-500, blue-600 and so on), so only OGSERC colours exist as utilities. An ESLint `no-restricted-syntax` rule fails on any hex colour in a string, template or JSX text anywhere in `src/` (this also catches Tailwind arbitrary values such as `bg-[#fff]`).

**Why:** CLAUDE.md requires the palette to be defined once and never hard-coded elsewhere. Removing the default palette makes an off-brand colour impossible rather than merely discouraged. The lint rule was tested with a probe file: `bg-[#1D9D62]` and a template string containing `#fff` both failed, and `#main` (an anchor) passed.

## D-024 Palette roles and contrast checks; `ink` is a placeholder (2026-10-10)

**Decision:** The five logo colours from SRS 2.4 are used as follows. Derived tints are added only where needed, each with a checked purpose.

| Token | Value | Role |
|---|---|---|
| `green-900` | `#0D4126` | utility bar, hero, footer, focus ring on light backgrounds |
| `green-700` | `#1D7248` | links, menu bar, secondary buttons |
| `green-500` | `#1D9D62` | icons, borders, decoration |
| `green-300` | `#A5D07D` | highlights, badge borders |
| `gold-400` | `#FED009` | primary buttons, accents, underlines, focus ring on dark backgrounds |
| `ink` | `#4A3F2A` | **placeholder** olive-brown: body text, text on gold |
| `green-50`, `green-100` | `#EEF6EF`, `#DCEDDC` | section and hover backgrounds (derived) |
| `gold-500` | `#E6BC00` | primary button hover (derived) |
| `ink-muted` | `#5C5546` | secondary text (derived) |
| `line`, `line-strong` | `#C9D8CC`, `#7A8C7E` | decorative borders; form control borders (derived) |
| `danger` | `#B42318` | errors, revoked status (derived, not a brand colour) |

**Contrast checked** with the WCAG 2.1 formula (a script run during step 2), and again on the rendered pages by axe in the Playwright suite:

| Pair | Ratio | Result |
|---|---|---|
| ink on white / green-50 / gold | 10.3 / 9.4 / 7.0 | AA text |
| ink on gold-500 (hover) / green-300 | 5.7 / 5.9 | AA text |
| ink-muted on white / green-50 | 7.4 / 6.7 | AA text |
| green-700 on white / green-50 | 5.9 / 5.4 | AA text |
| green-900 on white; white on green-900 | 11.7 | AA text |
| white on green-700 | 5.9 | AA text |
| gold on green-900 | 7.9 | AA text |
| green-100 / green-50 on green-900 (hero, footer text) | 9.5 / higher | AA text |
| danger on white / green-50 | 6.6 / 6.0 | AA text |
| line-strong on white (input borders) | 3.6 | non-text 3:1 |
| green-500 on white | 3.5 | **large text and non-text only** |
| white on green-500 / ink on green-500 | 3.5 / 3.0 | **never text on green-500** (axe caught ink on green-500 on the first draft of `/design-system`) |
| gold or gold-500 on white | 1.5 / 1.8 | **never text, never a focus ring on white** |

**Placeholder:** SRS 2.4 says to sample the dark olive-brown from the full logo lockup with the commission's name. Only the wordmark was supplied (`public/brand/ogserc-logo.png`), and `docs/reference/` holds only benchmark screenshots, so there is nothing to sample. `#4A3F2A` is a stand-in, labelled in `globals.css` and on `/design-system`. When the lockup arrives, replace the value and re-run the checks (RUNBOOK §11).

## D-025 Typeface: Public Sans, self-hosted with `next/font` (2026-10-10)

**Decision:** Public Sans (variable, SIL Open Font License) is loaded with `next/font/google`, using the `latin`, `latin-ext` and `vietnamese` subsets and `display: swap`.

**Why:**

- **Purpose:** Public Sans was designed as a neutral, highly legible face for government websites.
- **Distinct from the benchmark:** it is a sans-serif, unlike the benchmark's serif, which keeps OGSERC's look its own.
- **Light:** one variable file covers every weight.
- **Private:** `next/font` downloads the font at build time and serves it from our own domain, so visitors' browsers never contact Google (no third-party requests; a simpler CSP in step 12).
- **Yoruba:** the `vietnamese` subset carries the dot-below letters used in Yoruba place names (ẹ, ọ, ṣ). This was checked in Next's font data, and the letters render on `/design-system` (Abẹokuta, Ijẹbu-Ode, Ṣagamu, Ọta).

**Trade-off:** the build needs internet access to fetch the font once. CI and Docker builds already have it. If an offline build is ever required, switch to `next/font/local` with the font files committed.

## D-026 Main menu: WAI-ARIA disclosure pattern in one small client component (2026-10-10)

**Decision:** `src/components/layout/MainNav.tsx` is the only client component in the layout. Each dropdown is a `<button aria-expanded aria-controls>` that shows or hides a list of ordinary links (the disclosure pattern), not an ARIA `menu`/`menuitem` widget.

- **Desktop (1024px and up):**
  - Enter, Space or a click toggles a dropdown, and only one is open at a time.
  - Escape closes it and returns focus to its button.
  - Tabbing out or clicking elsewhere closes it.
  - The 11-item Regulatory Instruments list shows as two columns that read downwards.
- **Below 1024px:**
  - A "Menu" button in the green bar expands the seven items inline, and each section is its own disclosure.
  - Escape closes the menu and returns focus to the Menu button.
  - The panel pushes the page down rather than covering it, so no scroll locking is needed.
  - The utility bar (Contact Us, Licences, FAQs, Search) stays visible at every width, because it fits at 360px.

**Why:** WAI-ARIA guidance recommends the disclosure pattern for site navigation. The `menu` role promises application-style arrow-key behaviour that screen-reader users do not expect on a website. Keeping everything else as server components keeps client JavaScript small for low-bandwidth users.

**Checked:** Playwright tests cover:

- each dropdown's link count against SRS §4
- opening with the keyboard, closing with Escape, and focus returning to the button
- closing on a click outside
- the mobile panel
- no horizontal overflow at 1024px, the narrowest desktop width (the first version overflowed by 66px, so padding was reduced)
- axe with menus open, at 360px and 1280px

## D-027 Unbuilt pages link to one shared `/being-prepared` page; the menu structure stays in code (2026-10-10)

**Decision:** `src/lib/navigation.ts` records every SRS §4 destination with its final, clean, lowercase URL (for example `/regulatory-instruments/rules-and-regulations`) and a `ready` flag. While `ready` is false, the link goes to `/being-prepared`, a single page that says "This section is being prepared" (with breadcrumbs, `noindex`). When a later build step creates a page, it sets `ready: true`. Search also links there until step 10; no search box is shown before search works.

**Why:** The person reviewing never meets a broken link, and no fake pages are created. URLs are decided once, now. The menu labels and structure are fixed by the SRS rather than being editable content, so they are kept in code. If OGSERC wants staff to edit the menu, a Payload global can replace this file in step 4.

## D-028 Homepage placeholder content in one file: a temporary exception (2026-10-10)

**Decision:** All sample text for the homepage, footer and contact details is in `src/lib/placeholder-content.ts`. Every string reads "[Sample …, OGSERC to supply]". The types roughly match the collections that step 4 will add.

**Why:** The design and homepage must be reviewed before collections exist (SRS 2.5, build order). This is a **temporary exception** to the rule that content is edited in the CMS and never hard-coded. Step 4 replaces the file with Payload queries and the seed script (FR-CMS-08), and the RUNBOOK §11 checklist confirms it is gone before launch. Nothing regulatory is invented. Notice categories are the SRS FR-NEWS-03 labels. The hero button wording ("How to make a complaint") is a proposal for OGSERC to confirm.

## D-029 Logo trimmed; crest slot; no hero photo or map yet; default 404 kept (2026-10-10)

**Decision:**

- **Logo:** the supplied wordmark has wide transparent margins (1920×1038). It was trimmed once with `sharp` (already a dependency) to `public/brand/ogserc-wordmark.png` (640×144). The original file is unchanged. The header shows it beside the commission's full name as live text, which stays sharp and is read by screen readers.
- **Crest:** a dashed, labelled placeholder slot (`CrestPlaceholder.tsx`) holds the crest's place until OGSERC supplies it.
- **Hero:** a green gradient with a faint gold bolt, and no photograph. No suitable photo exists, and the benchmark's images must not be used.
- **Contact map:** a labelled placeholder. Embedding Google Maps would add third-party scripts and cookies, affecting the cookie notice (FR-WEB-06) and the CSP (D-011). The map provider is decided with the Contact page in step 5.
- **404 page:** an unmatched URL still shows Next.js's default 404 page, which reveals no internals. Because the app has two root layouts (public site and Payload admin), a branded page for unmatched URLs needs Next's `global-not-found`, which is still experimental. Revisit in step 11.

## D-030 Latest Updates is a CSS scroll-snap row, not a carousel (2026-10-10)

**Decision:** The FR-WEB-02 "Latest Updates carousel" is a horizontal list with CSS scroll snapping: about one card visible on phones, two on tablets and three on desktops. There are no arrow buttons, no autoplay, and no JavaScript. The scroll area is a labelled, focusable region, so keyboard users can scroll it with the arrow keys (axe rule `scrollable-region-focusable`). A "View all news" link follows the heading.

**Why:** Project owner's instruction for step 2. It also avoids the known accessibility problems of carousels (moving content, hidden controls) and keeps the page light.

## D-031 `/design-system` review page (2026-10-10)

**Decision:** `/design-system` shows every colour (role and contrast), the type scale, buttons, focus states, badges (including document statuses), cards and form controls. It is not linked from the site, is marked `noindex, nofollow`, and is deleted before launch (RUNBOOK §11).

**Why:** SRS 2.5 asks OGSERC to approve the design system itself (colours, typography, spacing, buttons, cards, forms), not only the homepage. A live page shows real rendering and keyboard focus, which a static document cannot.

## D-032 Desktop menu labels wrap instead of overflowing; font fallback fix deferred to step 11 (2026-10-13)

**Problem:** In CI (Linux), the test "the menu bar fits at 1024px" failed every time: the page was 15px wider than the viewport. It passed on Windows. Findings:

- **The element:** the desktop main-menu list. Its seven items could not wrap (`whitespace-nowrap`), so the last item, "User Profile", was pushed past the right edge.
- **No headroom:** at 1024px, the labels took 1002px of the 1008px available with Public Sans on Windows, about 6px spare. Linux lays the same text out a few pixels wider, which was enough to overflow.
- **Hidden shrinking:** the chevrons could shrink as flex items, silently absorbing small overflows before the test noticed.
- **Not a scrollbar:** Playwright runs headless Chromium with `--hide-scrollbars` on every OS, and nothing in `src/` uses `100vw` or a full-bleed trick.

**Decision:** The bar no longer depends on exact font widths. In `MainNav.tsx`:

- **Items can wrap:** each desktop item can shrink (`min-w-0`), and its label may wrap onto two centred lines (`text-center leading-tight`, no `whitespace-nowrap`). Two lines fit inside the existing 48px bar, so the bar never becomes wider than the screen.
- **Chevrons:** a chevron cannot shrink. It now follows the last word of its label inline, so a wrapped label reads "Regulatory / Instruments ⌄" rather than leaving the arrow apart from the text.

**Tests:**

- **Existing test:** "fits at 1024px" keeps its assertion. On failure it now prints each element past the viewport edge (tag, classes, how far) and whether Public Sans was loaded.
- **New test:** "fits at 1024px even with a wide fallback font" blocks the web font, forces a deliberately wide font (Verdana or DejaVu Sans with extra letter spacing), and asserts three things:
  - no horizontal overflow
  - at least one label wraps, which proves the stress took effect
  - no label needs more than two lines
- **Checked against the old behaviour:** with the old no-wrap CSS injected, the new test failed with 183px of overflow, naming "User Profile".

**Trade-off:** near 1024px, or with a wide fallback font, the longer labels ("Regulatory Instruments", "Consumer Complaint") can show on two lines, so the bar can look slightly different from one device to another. It never breaks. Screenshots: `docs/design-review/header-1024.png` and `header-1024-wide-fallback.png`.

**Alternatives considered:**

- **Show the mobile menu up to 1280px:** this would hide the desktop menu from tablets in landscape and from common laptop widths (a 1366px laptop at 125% scaling is about 1093px), and it would still depend on font widths at 1280px.
- **Smaller text or tighter padding:** this only moves the width at which the bar breaks.

**Deferred to step 11: the font fallback.** next/font's metric-matched fallback for Public Sans is `src: local(Arial)`. Linux and Android do not have Arial, so on those devices text is drawn in the system sans-serif, which is much wider (about 14% on the menu), until Public Sans loads. Slow connections make that period longer, and if the font fails, it lasts the whole visit. The layout now copes. The remaining work is visual: less text reflow when the font swaps in, and a closer match on Linux and Android. Options include a fallback stack with metric-compatible fonts (for example Liberation Sans or Roboto) and `next/font`'s `fallback` and `adjustFontFallback` settings. Listed in CLAUDE.md, build step 11.

## D-033 Ink colour `#483A16`, sampled from the full logo lockup (2026-10-13)

**Decision:** `--color-ink` is `#483A16`, sampled from the commission name in the full OGSERC logo lockup. It replaces the placeholder `#4A3F2A` in D-024 (that table's `ink` row is superseded; the other rows stand). The value is approximate, because the source is a compressed image; if OGSERC supplies an exact brand value, use it and re-run the checks.

**Contrast** (WCAG 2.1 formula, plus axe on the rendered pages in the Playwright suite):

| Pair | Ratio | Result |
|---|---|---|
| ink on white | 11.1 | AA text |
| ink on green-50 / green-100 | 10.1 / 9.1 | AA text |
| ink on gold-400 / gold-500 (buttons, hover) | 7.5 / 6.1 | AA text |
| ink on green-300 | 6.3 | AA text |
| ink on green-500 | 3.2 | **still never text on green-500** |

`ink-muted` (`#5C5546`, 7.4:1 on white) is unchanged.

## D-034 Image pipeline: optimised masters, metadata stripped, originals not committed (2026-10-13)

**Decision:**

- **Script:** `scripts/optimise-images.mjs` (using `sharp`, already a dependency) prepares supplied images:
  - hero photographs become 2048px-wide JPEG masters (quality 80, mozjpeg) in `src/assets/hero/`, which sits outside `public/`, so a master is never served at full size
  - the crest's white margin is trimmed, and its unused alpha channel is dropped, into `public/brand/ogun-state-crest.png`
- **Metadata:** `sharp` writes no metadata unless asked to keep it, so EXIF, GPS, XMP, IPTC and ICC are all dropped. Images are converted to sRGB first so colours do not shift. The script then re-reads every output and fails if any metadata remains. The supplied files had no EXIF or GPS, only an ICC profile, but the step is kept for future photos (phones embed GPS by default). Next's image optimiser re-encodes again on top of this.
- **Serving:** `next/image` serves AVIF, then WebP (`images.formats`). `images.qualities` is `[60, 75]`: 60 for hero photos under a dark overlay, 75 for everything else. A phone downloads the first hero at 640px wide as a roughly 6 KB AVIF.
- **Originals:** the full-size originals (1.8 to 2.0 MB, up to 5637px wide) were removed from `public/`, where anyone could download them, and are not committed again. They remain in git history (commits 5326dd3, 6402bd5, b1c7b78); history was not rewritten. `electricity1.jpg` was not chosen, and the Nigeria coat of arms is held back until OGSERC confirms permission (step 2b).
- **Credits:** every image's source and licence is tracked in `docs/ASSET-CREDITS.md`. Entries marked TO CONFIRM must be resolved before launch.

**Why:** keeps pages light on mobile data (SRS §12 Performance), keeps the repository small, and never publishes location data hidden in photographs.

**Gotcha found:** Windows file names are case-insensitive, so writing `ogun-state-crest.png` overwrote `Ogun-State-Crest.png` on disk. Keep source and output folders separate when re-running the script.

## D-035 Desktop dropdowns open on hover as well as click and keyboard (2026-10-13)

**Decision:** This extends D-026. The disclosure pattern and keyboard behaviour stay the same, and dropdowns now also open on mouse hover:

- **Hover only where possible:** a dropdown opens on `pointerenter` only when the pointer is a mouse and `matchMedia('(hover: hover)')` matches. Touch devices open it with a tap (a click). Hovering is never the only way: click, Enter and Space still toggle.
- **Closing:** a dropdown opened by hover closes 300ms after the pointer leaves, and moving back in cancels the close. A click on it "pins" it open, so it stays until a second click, a click outside, Escape or focus leaving.
- **WCAG 1.4.13 (content on hover):**
  - *hoverable:* the panel sits inside the item with no gap
  - *persistent:* there is no timeout while the pointer is over it
  - *dismissible:* Escape closes it from anywhere on the page, even when focus is elsewhere, and hover does not reopen it until the pointer has left
- **Tests:** `tests/e2e/menu-hover.spec.ts`.

## D-036 Mobile header and menu drawer (native `<dialog>`) (2026-10-13)

**Decision:** This supersedes the mobile parts of D-026 (the inline panel, and the utility bar at every width).

- **Header below 1024px:** one row with the wordmark, the crest (40px) and a Menu button. The commission name and the utility bar show from 1024px only. Below that, the utility links (Contact Us, Licences, FAQs, Search) are in the drawer. The logo link's accessible name always includes the full name. The header fits at 320px.
- **Drawer:** a native modal `<dialog>` (`showModal()`), sliding in from the left over a dimmed backdrop. The browser provides the top layer, makes the page behind inert, and handles Escape (the `cancel` event). The component adds the rest:
  - Tab and Shift+Tab wrap inside the drawer
  - a click on the backdrop closes it
  - page scrolling is locked while it is open (`overflow: hidden` on `<html>`, set from JavaScript so it also works in browsers without `:has()`)
  - focus returns to the Menu button on every close
  - the drawer closes if the window grows past 1024px, so an invisible modal never leaves the page inert
- **Animation without support:** the slide and fade use `@starting-style` and `transition-behavior: allow-discrete`. Without them, the drawer still opens and closes, instantly:
  - the open state uses only long-supported CSS
  - the off-screen transform applies only while the dialog is closed (`display: none`)
  - a browser that does not know `allow-discrete` drops the whole `transition` declaration, so nothing is left half-animated

  **How this was checked:** a Playwright test removes the drawer's transitions (`transition: none !important`), which is what such a browser computes. It then confirms that the drawer is fully on-screen as soon as it opens (x = 0, full width, focus on the close button) and fully gone as soon as Escape is pressed. This was a reading of the cascade plus that test. Older browsers were not run.
- **Styles:** the drawer's CSS lives in `src/components/layout/drawer.css`, using theme tokens only.
- **Tests:** `tests/e2e/mobile-drawer.spec.ts` (open, focus trap, Escape, backdrop, close button, scroll lock, links, no-animation fallback, header at 320 and 360px) and `navigation.spec.ts` (contents, axe with the drawer open).

## D-037 Hero carousel (2026-10-13)

**Decision:** The FR-WEB-02 hero becomes a carousel (FR-WEB-08), superseding D-029's "gradient, no photograph". It uses the three photographs OGSERC supplied, in the order agreed for step 2b (`electricity4`, `3`, `2`).

- **Structure:** WAI-ARIA carousel pattern. The `<section>` has `aria-roledescription="carousel"` and the label "Highlights". Each slide is a group labelled "N of 3". Inactive slides are `inert`. A fixed h1 (the commission's name) sits above the slides, and each slide headline is an h2, so the page keeps one visible h1 whichever slide shows.
- **Content:** slide 1 carries the tagline and introduction placeholders, and slides 2 and 3 have headline placeholders. Each slide has one primary action. The labels "View energy caps" and "Browse regulatory instruments" are proposals for OGSERC to confirm, like "How to make a complaint".
- **Controls:** Pause/Play (always visible), previous, next and indicator buttons (`aria-current` on the active one). `aria-live` is "polite" only while paused.
- **Autoplay:** every 7 seconds, and never by default for `prefers-reduced-motion`. It pauses while the mouse is over the carousel, and stops when keyboard focus enters it (except on the Pause/Play button) until Play is pressed. This follows the WAI-ARIA auto-rotating carousel example.
- **Images:**
  - only slide 1's photo is in the HTML, with `preload` (Next 16's replacement for `priority`)
  - slides 2 and 3 mount after the `load` event, or on the first navigation
  - plain `loading="lazy"` would not defer them, because stacked slides sit inside the viewport
- **Alt text:** the photos have empty alt text (decorative). They are generic scenes, not Ogun-specific information, and the headline carries the meaning. If OGSERC supplies photos of specific sites or events, give them descriptive alt text.
- **Overlay contrast:** checked against a pure-white pixel, the worst case whatever the photo:
  - phones: green-900 at 80% over the whole image gives white text 6.4:1 and green-50 text about 5.9:1
  - desktop: a left-to-right gradient, 85% to 80% up to 65% of the width (the text column ends before that at 1024px and wider), fading to 40% where there is no text
- **Layout:** slides share one grid cell, so the hero's height never changes. Space for the controls is reserved before hydration, so there is no layout shift.
- **Without JavaScript:** slide 1 shows in full and no controls are rendered.
- **Tests:** `tests/e2e/hero-carousel.spec.ts` (controls, autoplay and pause via `page.clock`, focus stop, reduced motion, no JavaScript, one preloaded image in the HTML, served AVIF/WebP with no metadata and under 200 KB, axe).

## D-038 Logo splash and its inline script (2026-10-13)

**Decision:** A short logo splash shows on the first page of a browser session (FR-WEB-09).

- **Inline script:** a small script in `<head>` (`SPLASH_SCRIPT` in `Splash.tsx`) runs before first paint. It adds `splash` to `<html>` only when reduced motion is not requested and `sessionStorage` has no flag. Every `sessionStorage` call is inside `try/catch`. If storage is blocked, the splash is skipped rather than shown on every page. The hero and the rest of the page do not use storage.
- **Never blocking:**
  - without the class, the overlay is `display: none`, so there is no splash without JavaScript
  - the overlay has `pointer-events: none`
  - the page's content is always in the HTML underneath, so search engines and screen readers get it
  - the overlay is `aria-hidden`
- **Ending:** the splash ends on the `load` event. The hard cap is a CSS animation that fades it from 600ms to 800ms. A first version used a 600ms `setTimeout`, but tests showed the timer firing over a second late while the main thread was busy. An opacity animation runs on the compositor, so the cap holds.
- **Priority gotcha:** the splash shows the same logo image as the header, and React keeps only the first `<link rel="preload">` for a URL. The splash comes first in the page, so it must carry the same `fetchPriority="high"`, or the header logo loses its high priority. A test checks this.
- **CSP (step 12):** the inline splash script **must be hashed** (a `sha256-…` source in `script-src`) **or moved to an external file** when the strict Content-Security-Policy is added in build step 12 (D-011). Any edit to the script changes its hash. `suppressHydrationWarning` on `<html>` is needed because the script changes its classes before React hydrates. The script uses `dangerouslySetInnerHTML` with a fixed string and no user input.
- **Tests:** `tests/e2e/splash.spec.ts`.

**Performance:** measured with Lighthouse (D-041). Running the branch with and without `--force-prefers-reduced-motion` (which turns off the splash, autoplay and reveal) showed no difference in FCP or LCP.

## D-039 Motion: CSS and one IntersectionObserver, no animation library (2026-10-13)

**Decision:**

- **Scroll-reveal:** homepage sections carry `data-reveal`. `RevealOnScroll.tsx` (one small client component, rendered on the homepage) adds `reveal-pending` only to elements that start below the viewport, so nothing on screen flashes. It fades each one in once, using opacity and a 12px transform, so there is no layout shift (a test measures CLS under 0.01 while scrolling the whole page). Without JavaScript, before hydration, for reduced-motion users, or without IntersectionObserver, nothing is hidden.
- **Hover:** cards, quick-service tiles, event cards and buttons lift slightly on hover (`motion-safe:` utilities only).
- **Safety net:** a global `prefers-reduced-motion` rule in `globals.css` cuts every animation and transition to near zero.
- **Where the CSS lives:** the reveal styles are in `globals.css`, not a component stylesheet. A CSS file imported by a page-level component is shipped as a separate render-blocking `<link>`. That cost an extra round trip and about 130ms of FCP on simulated mobile, which a test now guards against. Component CSS imported from the layout (drawer, splash, footer pattern) is merged into the main stylesheet, so it is unaffected.

## D-040 Footer grid pattern (2026-10-13)

**Decision:** The footer has a decorative grid-of-boxes background (FR-WEB-12), in `src/components/layout/footer-grid.css`.

- **Drawing:** pure CSS. Two `repeating-linear-gradient`s draw 1px lines on a 32px grid in green-500 at 15% (`color-mix` with theme tokens, no hex values), and a mask fades the grid in from the top. Four cells are tinted gold at 18%: two on phones, four from 1024px.
- **Static:** no images, no JavaScript, no animation.
- **Decorative only:** `aria-hidden`, `pointer-events: none`, `z-index: -1` inside an `isolate`d footer with `overflow: hidden`, so it never covers text and cannot cause horizontal scrolling.
- **Contrast**, against the lightest part of the pattern (a gold cell, gold-400 at 18% over green-900):

  | Footer element | Ratio | Result |
  |---|---|---|
  | green-50 text | 7.1 | AA |
  | white headings | 7.8 | AA |
  | gold icons | 5.3 | non-text 3:1 |

  Over the plain grid lines the ratios are 8.8 and 9.6. axe cannot measure text over a background image: it reports such text as "incomplete" rather than passing, so these ratios are calculated (the same formula as D-024). The Playwright tests run axe on the footer, check that every footer link is the element hit at its centre, and check for no overflow at 360 and 1280px.

## D-041 Performance and JavaScript, before and after step 2b (2026-10-14)

**Method:**

- **Tool:** Lighthouse 13.5.0 via `npx` (not added to `package.json`), with its default mobile preset (simulated slow 4G, 4x CPU slowdown) and Playwright's Chromium.
- **Servers:** production builds of `main` and of this branch, served side by side on the same machine.
- **Runs:** 6 rounds, alternating main and branch, medians reported.
- **JavaScript:** summed from the homepage's script resources in a 360px Chromium page.

**JavaScript shipped by the homepage:**

| | Scripts | Transferred (compressed) | Decoded |
|---|---|---|---|
| main | 7 | 145.2 KB | 474.6 KB |
| step 2b | 9 | 149.2 KB | 483.2 KB |

The increase is about 4 KB compressed, for the carousel, the drawer, hover menus and the reveal observer.

**Lighthouse mobile, medians of 6 alternating runs:**

| | Score | FCP | LCP | TBT | CLS | Speed Index | Page weight |
|---|---|---|---|---|---|---|---|
| main | 82 | 0.93 s | 3.19 s | 447 ms | 0 | 2.51 s | 235 KB |
| step 2b | 83 | 0.93 s | 3.26 s | 427 ms | 0 | 2.29 s | 286 KB |

- **Page weight:** the extra 51 KB is mostly the hero photos, which load after the page's `load` event.
- **First measurement:** step 2b initially measured 3 points lower (FCP +130ms). Two causes were found and fixed: the page-level reveal stylesheet (D-039), and the splash dropping the header logo's preload priority (D-038).
- **Noise:** this machine's run-to-run spread is about ±3 points and ±150ms TBT, so differences of that size are noise.

**Revisit when:** the font fallback work in step 11 (D-032) and the CSP in step 12. The homepage LCP (about 3.2s on simulated slow 4G) was already above the 2.5s "good" threshold before this step. It is mostly script and font time, and is worth a dedicated look in step 11.

## D-042 Hero carousel: a pause/play button only, and a 5-second interval (2026-10-14)

**Decision:** This supersedes the "Controls" and "Autoplay" interval in D-037; the rest of D-037 stands.

- **No arrows or dots:** the previous/next buttons and slide indicators were removed at the project owner's request, for a cleaner hero.
- **Pause/play kept, for WCAG 2.2.2 (Pause, Stop, Hide):** content that moves automatically for more than five seconds needs a way to pause it. The control is:
  - a small icon on a 70% green-900 disc in the hero's bottom-right corner
  - named "Pause slideshow" or "Play slideshow", matching its state
  - a 44×44px target, though the visible disc is 32px
  - first in the carousel's tab order, as the WAI-ARIA carousel pattern recommends
- **Pause/play contrast:**
  - the icon is at least 6.8:1 against its disc, even over a pure-white pixel under the lightest part of the desktop overlay (40%)
  - the focus outline is the site's gold ring with a 7px green-900 halo outside it, because gold alone would be 1.5:1 against a bright photo there
- **Interval:** 5 seconds, held in one constant, `HERO_INTERVAL_MS` in `src/components/home/HeroCarousel.tsx`, so changing it is a one-line edit. The tests read the value from one place too (`INTERVAL` in `tests/e2e/hero-carousel.spec.ts`).
- **Kept from D-037:** no autoplay for `prefers-reduced-motion` (the button then reads "Play slideshow"); a pause while the mouse is over the hero; keyboard focus entering a slide stops rotation until Play is pressed; once Pause is pressed it stays paused; the crossfade; stacked slides with no layout shift; slide 1 in full without JavaScript.
- **Screen readers:** without arrows, screen-reader users cannot step through slides. They are not worse off:
  - every slide is in the HTML and labelled ("1 of 3" and so on, with `aria-roledescription`)
  - `aria-live` is "off" while playing, so automatic changes are never announced mid-sentence, and "polite" when paused
  - hidden slides are `inert`
  - moving focus into the hero stops rotation, so a keyboard or screen-reader user is never chasing a moving target

  The slides' actions also appear elsewhere: the complaint route is in the menu and quick services, and Energy Caps and Regulatory Instruments are in the menu.
- **Layout:** the controls row under the slide text is gone, and the button is absolutely positioned. The hero is 60px shorter on phones and tablets and 76px shorter on desktop (a little bottom padding was added so the button never touches the slide text). The text itself did not move, so the D-037 overlay contrast figures are unchanged (white text at least 6.4:1).
- **Tests:** `tests/e2e/hero-carousel.spec.ts` uses `page.clock`. It pauses the fake clock and steps it 100ms at a time, asserting that the slides change exactly 5000ms apart (checked by temporarily setting 7000ms: the test failed). It also covers Pause and Play, the hover pause, the focus stop, reduced motion, `aria-live`, the 44px target, the focus outline, the single button, no JavaScript, and axe with and without reduced motion.

## D-043 Back to top: a footer link, enhanced by a floating button (2026-10-14)

**Decision:** Every page gets a "Back to top" control (FR-WEB-13), in two layers.

- **Baseline, no JavaScript:** a plain `<a href="#top">` in the footer's bottom bar. `#top` is the `<body>`. The CSS `scroll-behavior` makes the jump smooth, or instant for reduced motion. Afterwards the browser's focus starting point is the top of the page, so the next Tab goes to the skip link.
- **Enhancement:** a floating round button in the bottom-right corner (`src/components/layout/BackToTop.tsx`).
  - Green-700 with a white arrow (5.9:1). Against white the button is 5.9:1, and against green-50 it is 5.4:1 (non-text 3:1).
  - A 44×44px target, named "Back to top"; the icon is `aria-hidden`.
  - Positioned `calc(1rem + env(safe-area-inset-*))` from the corner. The insets are 0 until the site opts into `viewport-fit=cover`, and correct once it does.
  - **Focus outline:** the same as the hero's pause button (D-042): the gold ring with a 7px green-900 halo, so it is visible over any background. Gold is 7.9:1 against the halo.
  - **Hover:** turns green-900 and lifts 2px, only on devices with hover and only with motion allowed.

**When it shows:** one IntersectionObserver, no scroll listener.

- It watches an `aria-hidden`, 1px-wide, one-viewport-tall sentinel at the top of the page, and the `<footer>`.
- The button shows when the sentinel is entirely above the viewport and the footer is not in view.
- It fades with opacity and `visibility` (200ms, none for reduced motion). While hidden it is out of the tab order and the accessibility tree.
- It is fixed and the sentinel is absolutely positioned, so there is no layout shift and no overflow.
- If IntersectionObserver is missing, the button stays hidden and the footer link remains.

**How overlap is ruled out:**

- **Footer content:** the footer holds the quick links, contact details and legal links. The button is never visible while any of the footer is on screen, so it cannot cover them, at any width or scroll position. At the bottom of the page the footer's own link takes over.
- **Hero pause button:** the button appears only after scrolling more than one viewport. That puts its top edge more than one viewport down the document, below the hero, so it can never meet the pause button in the hero's corner.
- **Main content:** the button does float over main content mid-page, as any floating button does.
- **Tests:** at 360 and 1280px, a test checks the first scroll position where the button appears (clear of the pause button and of every link and button) and the very bottom of the page.

**Focus after scrolling: the skip link.** The skip link is the first focusable element. Moving focus there means the next Tab continues exactly as on a fresh page load: utility bar, logo, menu. The header logo was the other candidate. Focusing it would skip the desktop utility bar (Contact Us, Licences, FAQs, Search).

- **The skip link's classes changed from `focus:` to `focus-visible:`.** After a mouse click or tap, focus moves there quietly, without the gold "Skip to main content" chip flashing up in the corner. When "Back to top" is pressed with Enter or Space, the chip appears, as it does on Tab.
- **`preventScroll`:** focus uses `focus({ preventScroll: true })` so it does not cut the smooth scroll short.

**Hidden when it should be:**

- **Menu drawer:** an unlayered CSS rule (`html:has(#mobile-menu[open]) .back-to-top`) hides the button while the drawer is open, with no extra JavaScript.
- **Splash:** it never shows near the top of the page, where the splash is. The splash (z-index 100) also sits above it (z-index 40).
- **Print:** `print:hidden` on both the button and the footer link.

**Keyboard:** the button comes right after `<main>` in the DOM, so while it shows, Tab from the end of the main content reaches it. Enter and Space both work: it is a native `<button>`.

**JavaScript cost:** measured as in D-041, on the homepage at 360px, comparing production builds of `main` and this branch. The script count is unchanged (9). The bundle grows by 570 bytes compressed (152,593 to 153,163) and 1,552 bytes decoded (493,912 to 495,464).

**Tests:** `tests/e2e/back-to-top.spec.ts` covers:
- hidden at the top, shown after scrolling, and hidden again back at the top
- a click returns to the top, with focus on the skip link, quietly
- Tab, Enter and Space, with the skip link then visible
- `scrollTo` behaviour `smooth`, or `instant` for reduced motion
- hidden with the drawer open
- hidden when printing
- the overlap checks at 360 and 1280px, and no horizontal overflow
- axe with the button showing
- the footer link with JavaScript disabled

**axe on a settled page (added after a CI failure):**

- **What failed:** CI's first run of the axe test with the button showing reported contrast failures in Public notices: `#7f9a8c`, which is green-900 at 53% opacity.
- **Cause:** axe had started while the section was still fading in (D-039). The colours themselves pass.
- **Fix, in the tests only:** axe scans that cover scroll-revealed sections first call `waitForSettledPage` (`tests/e2e/support/settle.ts`). It fades in every pending section, restores the scroll position, and waits until every finite animation and transition has finished.
- **Where it is used:** the back-to-top, homepage and smoke axe tests. The homepage and smoke scans previously skipped below-the-fold sections, which sit at opacity 0 until revealed, so they now check more.

## D-054 First deploy: OGSERC's VPS with Docker Compose and Caddy, as a closed preview (2026-10-28)

(Numbered after D-053 on the Step 3 branch, which is not merged yet, so the numbers do not clash.)

**Decision:** The owner asked to host the site on OGSERC's own VPS (AlmaLinux 8.10, 2 vCPU, 4 GB RAM, 100 GB SSD) at `ogserc.org.ng` before Phase 1 is complete. `docker-compose.prod.yml` runs the app, PostgreSQL 17 and Caddy 2.11.7 on that server. Until Step 3 is merged, `deploy/Caddyfile` closes `/admin` and `/api` (404), sends `X-Robots-Tag: noindex, nofollow`, and shortens HSTS to one day without `includeSubDomains`. The image is built on the server. `deploy/backup-db.sh` keeps 14 days of nightly `pg_dump` files. Steps are in RUNBOOK Sections 5 and 6.

**Why:**
- **What is deployed is `main`:** the design system and homepage. Staff sign-in is not ready for the internet: 2FA, rate limiting and the audit log are still to come, and the Users hardening (D-052) is on an unmerged branch. Public pages read through Payload's Local API inside the app and nothing public calls `/api`, so closing both paths at the proxy removes the whole staff surface without changing the app.
- **Caddy** (owner approved): one small config file, HTTPS certificates obtained and renewed automatically, HTTP to HTTPS redirect, HTTP/2 and HTTP/3. nginx with certbot does the same with more configuration and a separate renewal job. Swapping it later only changes this front door.
- **PostgreSQL on the VPS** instead of a hosted database: no extra cost, plain PostgreSQL (portability rules), and not reachable from the internet (no published port). The cost is that backups and off-server copies are ours to run (open item in RUNBOOK Section 6).
- **Building on the server:** the build needs no database (the Dockerfile sets placeholders), and pulling from a private registry would put a registry token on the server. 4 GB of swap covers the build's memory peak. If builds become slow or disturb the live site, build in CI and pull instead.
- **Short HSTS during the preview:** the app sends two years with `includeSubDomains`, which would make browsers refuse plain HTTP on every subdomain of `ogserc.org.ng` (webmail or a control panel, for example) for two years. The full header returns once every subdomain is confirmed to serve HTTPS.
- **noindex:** content is still placeholder ("[Sample, OGSERC to supply]"), and must not appear in search results as OGSERC's information.
- **File uploads:** none are possible while `/admin` is closed. The S3-compatible storage adapter still arrives with Step 4 (D-013).

**Not done here:** monitoring, off-server backups, a tested restore and spend limits remain step 13. Vercel stays possible: nothing in this change is VPS-specific inside the app.

## D-055 sharp falls back to WebAssembly on CPUs without x86-64-v2 (2026-10-28)

> **Did not fix the VPS: see D-056.** The WebAssembly build also needs a CPU feature (SSE4.1, for WebAssembly SIMD) that the VPS hides.

**Problem:** The first build on OGSERC's VPS failed while collecting page data: `Could not load the "sharp" module using the linuxmusl-x64 runtime. Unsupported CPU: Prebuilt binaries for Linux x64 require v2 microarchitecture`. Since 0.35, sharp's native Linux x64 binary refuses to load on a CPU that does not report x86-64-v2 (SSE4.2, POPCNT, SSSE3, CX16). The VPS's virtual CPU model hides those instructions. Next.js (image optimisation) and Payload (uploads) both load sharp, at build time and at run time, so building elsewhere would not help.

**Decision (owner approved):** Add `@img/sharp-wasm32` 0.35.5, pinned to the same version as `sharp`, as a direct dependency. sharp already tries it when no native binary loads (`dist/sharp.cjs`), so no code changes. On CPUs with x86-64-v2 (CI, developers, most hosts) the native binary still loads first and nothing changes.

**Checked:**
- `scripts/check-sharp-wasm.mjs` blocks every native sharp binary and resizes an image to AVIF and WebP. It passes from the repo and from `.next/standalone` (the bundle the Docker image ships: Next.js traces the package into it), and sharp fails with the VPS's error when the WebAssembly package is blocked too.
- CI runs the same check inside the built Docker image.

**Cost:** 9 MB in the image. WebAssembly image processing is slower than native, which matters only when an image is first resized (uploads, and the first request for each optimised size; Next.js caches the result). The package is by sharp's author, licensed Apache-2.0, LGPL-3.0-or-later (libvips) and MIT, the same as the native libvips packages already shipped.

**Better fix, still open:** ask the host to change the VM's CPU type to "host" or "x86-64-v2". Then native sharp loads again by itself. Keep the dependency anyway, so the site still runs on any x86 host (portability rules). **Remove it** only if every target host is confirmed to have x86-64-v2.

## D-056 Temporary: the VPS runs without image processing (`IMAGE_PROCESSING=off`) (2026-10-28)

**Problem:** D-055's WebAssembly fallback did not help. The next build on the VPS failed with `WebAssembly.Module(): Wasm SIMD unsupported`: sharp's WebAssembly build needs WebAssembly SIMD, which Node.js provides only on CPUs with SSE4.1. The VPS's virtual CPU hides even that (a generic model such as QEMU's `qemu64`). D-055's check blocked the native binary but ran on a CPU with SIMD, so it could not catch this. No sharp build can run on that CPU as configured, and building sharp from source is not possible on Alpine (libvips 8.17; sharp 0.35.5 needs 8.18.7 or newer). OGSERC has asked Truehost to change the CPU type ("host" or "x86-64-v2"); no answer yet.

**Decision (owner approved, to get the preview up):** A setting, `IMAGE_PROCESSING=off`, set only in the VPS's `.env`:
- `src/payload.config.ts` imports sharp only when the setting is on (importing it on that CPU throws) and otherwise starts Payload without it. Uploads would keep their original size and get no focal point; no uploads happen while `/admin` is closed (D-054).
- `next.config.ts` sets `images.unoptimized`, so images are served as they are instead of through the optimiser, which needs sharp. Next.js reads this at build time, so `docker-compose.prod.yml` passes it as a build argument as well as at run time.
- Everywhere else the setting is unset (on), and nothing changes.

**Cost:** the homepage serves its images at full size: hero photograph 142 KB (JPEG, not AVIF or WebP), wordmark 115 KB, crest 187 KB, instead of small optimised versions. This is against the low-bandwidth goal (NFR performance), acceptable for a closed preview only.

**Side effect:** sharp is now imported when Payload's config loads instead of at module import, so a host where sharp cannot load no longer fails the build: it logs the error and `/admin` and `/api` fail when first used. Normal hosts are unaffected.

**Checked:** `scripts/block-sharp-binaries.mjs` makes every sharp binary fail to load, as on the VPS. With it, a standalone build without the setting logs the VPS's error; with `IMAGE_PROCESSING=off` the build never mentions sharp, and the standalone server serves the homepage and every image without the optimiser. CI repeats this in the "Builds and serves without sharp" job.

**Undo when the CPU is fixed** (RUNBOOK Section 11): check `grep -cw sse4_2 /proc/cpuinfo` is above 0, remove `IMAGE_PROCESSING=off` from the VPS's `.env`, redeploy. Then remove this setting, its CI job and the helper, and decide on D-055's package (`@img/sharp-wasm32`): it helps only on CPUs with SSE4.1 but without x86-64-v2, which are rare, so removing it is likely.

## D-057 Real contact details and social links in the footer before the CMS exists (2026-10-29)

**Decision:** The footer summary, office address, phone, email and five social accounts (LinkedIn, Facebook, Instagram, X, TikTok) supplied by the owner replace their placeholders in `src/lib/placeholder-content.ts`. Email and phone are `mailto:` and `tel:` links in the footer and the homepage contact section. The footer shows the OGSERC wordmark on a white panel, because the green wordmark barely shows on the darkest-green footer. The social icons are outline marks added to `Icon.tsx` in its 24px, 2px-stroke style (shapes follow the common Lucide and Tabler outlines), so no icon library is added. Social links open in the same tab.

**Why:** The site is live as a preview (D-054) and `/admin` stays closed until Step 3 is merged, so staff cannot edit this yet. These are OGSERC's own published details, not invented content. This widens the D-028 exception only for these values. Step 4's seed must move them into the CMS, so the exception still ends at launch.

**Links as supplied, corrected:** the owner replaced the first LinkedIn link (admin-only) and Facebook link (a share link) with the accounts' own addresses. The Facebook address loses its redirect parameters and uses `www` instead of `web`. TikTok had no `https://`. A tracking parameter was removed from Instagram.

**Hero and favicon (same day):** slide 1's headline is OGSERC's tagline "Electricity for all in Ogun State", and its button reads "Learn more", with "about OGSERC" added for screen readers (WCAG 2.4.4), pointing to About Us (the "being prepared" page until About is built). The headlines on slides 2 and 3 were drafted for the owner to match their buttons. The introduction on slide 1 is still a placeholder. The favicon (`src/app/icon.png`) and home-screen icon (`src/app/apple-icon.png`) are the logo's "O" with the Ogun State map, cut from `public/brand/ogserc-logo.png`. At tab size the full wordmark would be unreadable. They are static files, so they need no image processing on the VPS (D-056).

**Tests:** the header-and-footer link test fetches only the site's own links and checks email, phone and social links by their form, so it never depends on another site being up.

## D-058 The office map loads only when the visitor asks (2026-10-29)

**Decision:** The office map (homepage contact section, and the contact page when it is built) is a panel with "Show map" and "Open in Google Maps". Google's embedded map (`www.google.com/maps/embed`, no API key) loads only after "Show map" is pressed, and focus then moves to it. Without JavaScript only the link shows. The link is OGSERC's own Google Maps link. The embed address uses the place it resolves to (OPIC Tower, 7.1344754, 3.3396073). Both are in `placeholder-content.ts` with the other contact details (D-057). Chosen by the owner over an always-loaded map or a link only.

**Why:** an always-loaded Google map adds roughly 1 MB on mobile data and sets Google cookies on every visit (which would need a cookie notice, FR-WEB-06). Loading on request keeps pages light (NFR performance), and nothing goes to Google unless the visitor chooses. No library is needed. The component is a small client component in `src/components/ui/OfficeMap.tsx`.

**Later:** the strict CSP (build step 12, D-011) must allow `frame-src https://www.google.com`. The privacy notice should say that showing the map loads content from Google. If OGSERC prefers the embed address from Google Maps' "Share > Embed a map", replace `embedUrl` only.

**Tests:** `tests/e2e/office-map.spec.ts` checks that no request goes to Google before the click (Google is never reached from tests; the embed is answered locally), that the map appears and takes focus after it, and that only the link shows without JavaScript.
