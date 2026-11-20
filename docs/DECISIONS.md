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
- **Tests:** at 360 and 1280px, a test checks the first scroll position where the button appears (clear of the pause button and of every link and button in the header and footer) and the very bottom of the page (the button hidden, nothing covered).
  - *Changed 2026-10-30 (owner's choice):* the first-position check used to cover every link and button on the page. That depended on whichever content happened to sit under the corner, not on the button, and the taller phone hero (D-062) moved a Latest updates card under it. It now checks what this decision guarantees.

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

## D-044 Test database isolation, and only one first administrator (2026-10-15)

**Decision:**
- Tests that need a database run with `pnpm test:e2e:db` (`playwright.db.config.ts`), against `TEST_DATABASE_URL`, never the development database.
- **Before anything starts**, the guard (`tests/support/test-db.ts`) refuses if:
  - `NODE_ENV` is production;
  - the database name does not contain `e2e` or `test`;
  - the host and database name equal those in `DATABASE_URL`.

  It prints only the host and database name, and has no bypass flag.
- **The reset** (`tests/support/reset-test-db.ts`, run before the server starts):
  - checks the guard again;
  - checks that `DATABASE_URL` names the test database;
  - checks `current_database()` and the pool's host on the live connection;
  - drops and recreates the `public` schema in that one database and runs the migrations.

  It never runs `DROP DATABASE` and never connects elsewhere.
- **The server:** the run starts its own server on port 3100 and never reuses one. It runs on the test database, with a separate `.next-e2e` build folder locally (only when `E2E_TEST_SERVER=true` and `NODE_ENV` is not production; production builds always use `.next`). Global setup reads the database the running server reports (`E2E_DB_IDENTITY_FILE`, written in `onInit`), prints it, and aborts on any mismatch.
- **First user:** the hook that makes the first user an administrator takes a transaction-scoped Postgres advisory lock (`src/lib/transaction-lock.ts`), recounts, and refuses a first-register request that lost the race.
- **Empty production database:** a production server with no accounts logs a `SECURITY:` error at startup.

**Why:**
- A test that empties the wrong database would destroy development or production content, so every layer checks independently.
- Running the test without the lock showed the race is real: two simultaneous first-register requests both returned 200 and created two administrators. Payload checks "no users" and creates the user in one read-committed transaction without a lock. With the lock: 403 and 200, and one user, in two separate runs.

**Trade-off:**
- Each `pnpm test:e2e:db` run starts a fresh server (about 1 minute locally).
- The host comes from the pool's connection string. Postgres reports the database name but not the hostname, so a DNS-level redirect would not be detected.

## D-045 Media uploads: real images only, 10 MB, publishers replace (2026-10-15, updated 2026-10-16)

**Decision:**
- **Types:** Media accepts exactly `image/jpeg`, `image/png`, `image/webp` and `image/avif` (`upload.mimeTypes`). There is no wildcard and no SVG, because SVG can carry script.
- **Content check:** a `beforeOperation` hook (`src/lib/uploads/image-signature.ts`) reads each uploaded file's first bytes. It rejects the file with a 400 unless the bytes are one of those four formats and the declared type and extension agree with them. No new dependency.
- **AVIF (2026-10-16):** a file counts as AVIF only if its `ftyp` major brand is `avif`, `avis` or `mif1` **and** `avif` is among its compatible brands. HEIC and HEIF (iPhone photos) share the `mif1` brand but are rejected; staff convert them to JPEG first. Tested with real JPEG, PNG, WebP and AVIF files from sharp's encoders, and with hand-built HEIC/HEIF headers (sharp cannot encode HEVC).
- **Sizes** (`src/lib/uploads/limits.ts`):
  - 10 MB per image, checked in the same hook (raised from 5 MB on 2026-10-16 at the owner's request). **OGSERC may change this**; it is one constant, `MAX_IMAGE_BYTES`, and must stay at or below the ceiling.
  - 25 MB global ceiling (`upload.limits.fileSize`), enforced while the request is read (413). It replaces Payload's default of 20 MB so Step 4 PDFs are not cut off.
- **Messages (2026-10-16):** staff who may make the upload are told which rule failed: the image's size and the limit; that the content is not one of the four formats; the declared type against the real one; or the file name's extension and the ones that fit. The declared type is repeated only if it looks like a media type. Anyone else (signed out, or an editor replacing a file) is not inspected by the hook. They get the access check's generic 403, which Payload runs after the hook and before it reads the file (checked in Payload 3.90.2's `create`, `updateByID` and `update` operations). Trusted server code using `overrideAccess` is still checked.
- **Access:** editors and above upload; only publishers and administrators replace, edit or delete, because a change to a published image shows everywhere it is used. Read stays public (`allowAll`, the only use; see D-049).

**Why:**
- NFR-SEC-08 requires uploads to be limited by type and size and checked by content.
- **Tested without the hook,** Payload's own check rejected HTML, SVG and HTML renamed `.png`. It **accepted a JPEG declared and named as a PNG (201)**, and it has no per-collection size limit.
- With the hook, `tests/e2e-db/media.spec.ts` rejects all of these, plus a valid image over the image limit (400) and a 27 MB file (413). Since 2026-10-16 it also accepts a 9.7 MB PNG and rejects a 10.8 MB one.

**Open questions:**
- **For Step 4 (draft files):** a file is public at `/api/media/file/...` as soon as it is uploaded, before any document that uses it is published. Options: keep media public and treat uploads as publishable; add a `published` flag checked by Media `read`; or keep draft documents' files in a separate access-controlled collection. Decide before building Documents.
- **For OGSERC:** the size limit for PDFs and other documents (Step 4). Until then only the 25 MB ceiling applies.

**Watch:**
- If a Next.js `proxy.ts` (middleware) is added, for example for the CSP nonce in step 12, Next caps request bodies at 10 MB by default (`proxyClientMaxBodySize`). Raise it to the upload ceiling, or uploads between 10 and 25 MB will fail.
- **Test note:** after a 413 the server stops reading the request, so the client's keep-alive connection cannot be reused. The ceiling test therefore uses its own connection.
- **Test uploads (2026-10-16):** the test server stores uploads in a throwaway `ogserc-e2e-media` folder in the OS temp folder (`MEDIA_DIR`), which is emptied before and after each run. Earlier runs wrote test files into the development `media/` folder.

## D-046 Test files and Playwright configs stay out of the Docker build context (2026-10-16)

**Decision:**
- `.dockerignore` excludes `playwright*.config.ts` as well as `tests/`.
- It also excludes local-only folders that are gitignored but not yet in `.dockerignore`: `.next-e2e`, `media`, `.claude`, `*.tsbuildinfo` and `playwright-report-db`.
- The type check is unchanged. There is no `ignoreBuildErrors`, no `skipLibCheck` change, and no build-only tsconfig.

**Why:**
- The Docker job failed in `pnpm build` with `playwright.db.config.ts(6,62): error TS2307: Cannot find module './tests/support/test-db'`.
- `next build` type-checks every file `tsconfig.json` includes (`**/*.ts`). `tests/` was excluded from the image, but `playwright.db.config.ts` was copied in and imports from `tests/support/`. The failure was reproduced in a copy of the exact Docker context, built from the tracked files and the old `.dockerignore`.
- `playwright.db.config.ts` is the only root code file that imports from an excluded folder. The other Playwright configs import only `@playwright/test` and are not needed in the image either.
- Excluding the configs is enough. With the new rules, the simulated context passes `pnpm typecheck` and `pnpm build`, with no test file, database-reset script or Playwright config in it.
- The local-only folders matter for `docker build` on a developer machine. CI's checkout never has them. `.next-e2e/types` is included by `tsconfig.json`, so stale route types from the test server could break or change the build. `media` holds development uploads that must never reach an image.

**Watch:**
- Any new root-level or `src/` TypeScript file that imports from `tests/` or `docs/` will break the Docker build in the same way.
- `scripts/*.mjs` are in the context but are not type-checked (`allowJs` without `checkJs`).

**Runtime stage:** the `runner` stage starts `FROM node:22-alpine`, not from `builder`, so it does not inherit the builder's placeholder `DATABASE_URL` and `PAYLOAD_SECRET`. The simulated build's `.next/standalone`, `.next/static` and `public` folders (what `runner` copies) contain neither value.

## D-047 Test database runs: the reset must confirm itself; earlier servers must be stopped (2026-10-16)

**What happened:** twice (2026-10-16 at 13:05, and again during this fix), a `pnpm test:e2e:db` run started on a test database that still held the previous run's accounts. The saved server log of the second case shows why. `pnpm payload run tests/support/reset-test-db.ts` printed only pnpm's banner, never loaded Payload or connected to the database, and **exited with code 0** about 6 seconds later. The harness trusted that exit code and started the server.

**Cause, as far as it can be established:** Payload's CLI (`payload/bin.js`) loads TypeScript through tsx's asynchronous loader worker. It disables Node's synchronous hooks on purpose, and calls `void start()` with nothing awaiting it at the top level. If that loader stalls before the script runs, Node finds nothing left to do and exits with code 0, without an error or an "unsettled top-level await" warning. The behaviour is certain; the stall inside tsx could not be reproduced on demand.

**Decision:**
- **The reset confirms itself.** After verifying the schema, the migrations and an empty `users` table, `reset-test-db.ts` writes a confirmation file (host, database, users: 0).
  - The wrapper (`tests/support/test-server.ts`) deletes that file before each attempt and starts the server only if a fresh one exists.
  - Without it, the wrapper retries once (the reset is idempotent and repeats every guard), then fails loudly.
- **The users table must be empty:** checked by the reset in the database (`reset-steps.ts`), and again in global setup through the running server before the first test (`/api/users/init` must report `initialized: false`).
- **No earlier server:** before anything else, the config (and the wrapper again, before the reset) refuses if something accepts connections on the test port (IPv4 or IPv6 localhost, 1-second timeout), or if the process recorded by the previous run is still alive.
  - This runs before Playwright's own check because that check is an HTTP request with no timeout: a hung earlier server that accepts connections but never answers makes Playwright wait for ever.
- **Server log:** everything the reset and the server print is also written to `test-results/e2e-db-server.log` (git-ignored, uploaded with the CI report on failure). Secrets are removed first:
  - the exact values of secret-named environment variables (`*DATABASE_URL`, `*SECRET*`, `*PASSWORD*`, `*TOKEN*`, `*_KEY`, `*_KEY_ID`);
  - connection strings, JWTs, reset links, tokens in URLs and password fields in JSON.

  Unit tests cover each, and a scan of real runs' logs found no secret value, database URL or token.

**Ruled out:**
- A leftover server or connection from an earlier run was not the cause in the observed case. Port 3100 was free, no earlier test-server process existed, and the log shows the reset never ran.
- Such a server could still write after a reset. That is why the port and process checks exist.

**Watch:** other `payload run` and `payload migrate` commands may be affected the same way, including `pnpm migrate` in CI. Treat a silent, quick exit of a Payload CLI command as "did not run".

## D-048 Staff accounts: email changes by administrators only; roles kept out of the session token (2026-10-16)

**Decision:**
- **Email:** only administrators can change an account's email address. It is the sign-in name, so a change by anyone else would be a way to take over or disguise an account.
  - Done by overriding only the `access.update` of Payload's built-in `email` field. Payload deep-merges it with the original (`fields/mergeBaseFields.js`), which keeps the built-in validation, uniqueness and lower-casing.
  - The admin panel then shows the field read-only for everyone else (`EmailAndUsername`: `readOnly: !permissions.email.update`).
  - Create access is left open, because the first-register screen has no signed-in user; creating accounts is administrators-only anyway.
- **Roles not in the token:** `saveToJWT` is removed from `roles`.
  - Payload's JWT strategy reloads the user from the database on every request (`auth/strategies/jwt.js`, `findByID`), so the token's copy of the roles was never used for decisions. It only disclosed them to anyone holding the token.
- **No migration:** neither change alters the schema. `pnpm migrate:create --skip-empty` generated no statements.

**Tests** (`tests/e2e-db/users.spec.ts`). Run first against the unchanged code; two failed, which led to the two changes above:
- An editor cannot set roles on their own account or anyone else's, or create accounts. Field access drops the value silently, so the stored record is checked.
- A second administrator cannot change their own roles, alone or in a bulk update that also (successfully) changes another account. Payload passes each document's id to field access in bulk updates, so `canSetRoles` sees the administrator's own id.
- Unknown roles (`superuser`, a mix with a valid role, `''`) and an empty list are rejected with 400 by Payload's select validation. No extra `validate` is needed.
- A demotion takes effect on the next request made with the same token.
- The token's claims contain no `roles`. *(Failed before the change.)*
- An account with no roles is refused: no user list, no upload, no admin panel. It can still read public media.
  - Its roles are removed directly in the test database by `tests/support/strip-roles.ts`, because the API requires at least one role. That script runs under the same guards as the reset and confirms its own result (D-047).
- A non-administrator's attempt to set `hash`, `salt`, `loginAttempts`, `lockUntil`, `resetPasswordToken`, `resetPasswordExpiration`, `_verified`, `apiKey` or `enableAPIKey` changes nothing. Payload already denies the first six through field access, and the last three do not exist (verification and API keys are off). Checked from outside:
  - the original password still works;
  - one wrong password does not lock the account (it would have, had `loginAttempts` become 4);
  - the planted reset token cannot reset the password;
  - none of these keys appear in the stored record.
- Only an administrator can change an email address, and the admin panel's permissions show the field read-only for a publisher and editable for an administrator. *(Failed before the change: the publisher changed their own email.)*

**Watch:**
- Payload's `sessions` field has `update: () => false` but no `create` rule. Only administrators can create accounts, and a planted session id is useless without a token signed with `PAYLOAD_SECRET`. Revisit if account creation is ever opened up.
- The last-administrator rules, sign-in limits, cookie settings and password policy are the next commits of the Step 3 plan, not this one.

## D-049 Content saving: only publishers change what the public sees; the Local API rule (2026-10-19)

**Decision:**
- **Editors save drafts only** (FR-CMS-06, SRS Section 10). Two layers:
  - `canSaveContent` (create and update access) refuses an editor who sends `_status: 'published'`.
  - `guardPublishedContent` (`src/access/guard-published-content.ts`), a `beforeOperation` hook on `create`, `update` and `restoreVersion`. For anyone without `content:publish` it refuses: a non-draft update of any published document (by id or in bulk); a draft save whose `_status` is not absent or `'draft'`; a non-boolean draft flag or missing data; a duplicate unless saved as a draft; restoring a version over a published document; and per-locale publish options. It **fails closed**: anything it does not recognise as safe is refused. Trusted server code (`overrideAccess: true`) passes; Payload never takes that value from a request.
- **The Local API rule** (CLAUDE.md, Security and data rules): the Local API skips access control by default, so any query feeding a public page, search or the sitemap passes `overrideAccess: false` or filters to published documents. `overrideAccess: true` only in hooks, seed and migrations, never with request values.
- **`allowAll` uses**, kept in step with `ALLOW_ALL_USES` in `tests/unit/config-access.spec.ts` (the audit fails on any other use, and on any use that is not a read):

  | Use | Reason |
  |---|---|
  | `media.read` | Images are public (D-045). Revisit with the Step 4 draft-files decision. |

**Why (group D results, 2026-10-18):**
- Written as tests first, against `canSaveContent` alone. An editor could **change a published document by leaving `_status` out**, and **unpublish it by sending `_status: 'draft'`**. Payload runs create/update access on the request's `data` before it decides `_status`, without the stored document or the draft flag. A duplicate copies the original's `_status`, and a version restore is its own operation, so access never sees either.
- With the hook, all 35 cases pass (`tests/e2e-db/drafts.spec.ts`, on the test-only `e2e-drafts` collection, D-050): creating, changing and unpublishing published documents, publishing drafts, bulk updates, version restores and duplicates, each through the Local API with a real user and through Payload's REST pipeline. Publishers and trusted code are allowed. Anonymous requests see only published documents and no versions, even when they send `overrideAccess` and `draft` in the query, headers and body. On the running server, an editor sending `overrideAccess` cannot change another account.
- `tests/unit/config-access.spec.ts` requires the hook on every collection that uses `canSaveContent`, in the deployed config and with the test collections.

**Not atomic:** the hook checks first ("is any target document published?") and Payload writes afterwards. Both run in the same transaction (`req`), but nothing is locked. So an editor's save of a draft can pass the check, a publisher can publish that same document in the same instant, and the editor's write then lands on the now-published document, where it can change or unpublish what the public sees. It needs an editor and a publisher saving the same document within milliseconds of each other. If it ever matters, take a transaction-scoped advisory lock per document in the hook, and in the publish path too (`src/lib/transaction-lock.ts`, as for the first user in D-044).

**Step 4 notes:**
- Hide or disable admin controls that return 403 for editors (for example Publish on a published document), so editors aren't shown actions they can't take.
- Add one real HTTP test of these rules on a real content collection, and the test that a draft never appears on a public page, in search or in the sitemap.
- Decide where draft documents' files live before building Documents (D-045 open question).
- Watch the drafts test's second `payload run` in CI (time, silent exits: D-047).

## D-050 A test-only drafts collection, with its tables in every database (2026-10-18)

**Decision:**
- `e2e-drafts` (`src/collections/test/E2EDrafts.ts`) is the smallest collection with drafts. It exists so the content rules (`canSaveContent`, `publishedOnly`) can be tested before Step 4 adds real content collections. Pulled forward from Step 3 plan commit 8.
- It is registered only when `E2E_TEST_COLLECTIONS` is exactly `true`. The server already refuses that flag in production (`src/lib/env.ts`).
- **Who sets the flag:** only the `migrate:create` script and test code. `build`, `start`, `dev`, `migrate`, `generate:types`, the Dockerfile, docker-compose, CI and both test servers never do. `tests/unit/test-flag.spec.ts` fails if the flag appears anywhere else.
  - `generate:types` was meant to set it too, but Payload rewrites `payload-types.ts` on every development start without it, so the types would flip back and forth. The committed types describe the deployed config. Test code names the test collection with an explicit cast.
  - `migrate:create` always sets it. Otherwise a later migration made without it would contain `DROP` statements for these tables.
  - The test servers don't need it. The drafts test runs through the Local API in a `payload run` script that sets it for that process only. CI's test server is the production build, which must refuse the flag.
- **The tables are in a normal migration** (`20261018_173528_e2e_drafts`), so **every database, production included, has them, empty**:
  - `e2e_drafts` and `_e2e_drafts_v`, with two enum types and indexes;
  - plus a nullable `e2e_drafts_id` column, foreign key and index on Payload's own `payload_locked_documents_rels`.
  - With the flag off, nothing reads or writes them. Payload ignores columns its config doesn't define.
- **Not conditional.** A migration's `up` is TypeScript and could check the flag. It doesn't, because the schema would then depend on an environment variable at migrate time. The database would stop matching the committed snapshot (`src/migrations/*.json`), which later `migrate:create` runs diff against and the post-migration check verifies.
- If OGSERC wants the tables gone before launch, a normal migration drops them (step 13 launch checklist).

**Tests:** `tests/unit/config-access.spec.ts` audits the config both as deployed and with the test collections. It checks that the collection is absent unless the flag is exactly `true`.

## D-051 Checking the database after migrations (2026-10-19)

### Part 1: `pnpm db:verify`

**Decision:**
- **`pnpm db:verify`** (`scripts/db-verify.ts`, which runs `scripts/db-verify-payload.ts` through `payload run`) checks that the database in `DATABASE_URL` has:
  - every table the code's Payload config defines;
  - a record in `payload_migrations` for every migration in `src/migrations`.

  It prints the host and database name, then any missing tables or migrations, and exits non-zero if anything is missing.
- **Where it runs:**
  - In CI, straight after `pnpm migrate`.
  - On a developer's machine after `pnpm migrate`.
  - Against production only from a full checkout of the deployed commit. The production image has no `src/`, no Payload CLI and no TypeScript loader, so it cannot run there.
- **`--show-target`** prints the host and database name and connects to nothing, so the target can be checked first.
- **Read-only:**
  - It refuses `NODE_ENV=production`, because Payload applies pending migrations on connect in production.
  - It adds `-c default_transaction_read_only=on` to the connection's `options` parameter (`src/lib/db/read-only.ts`), merged with any existing value, so Postgres refuses every write, DDL statement and `CREATE DATABASE` in the session.
  - It checks `SHOW transaction_read_only` on the live session before anything else and stops if it is not `on`. A server or pooler that ignored the option therefore causes a refusal, not an unprotected check.
  - It checks that the live connection is the host and database in `DATABASE_URL`.
- **It confirms itself (D-047):** the script writes a confirmation file, and the wrapper counts success only from a fresh one. Without one, the wrapper retries once and then exits non-zero.
- **No secrets in output:** database names come only from `describeDatabase` (host and database name; unit-tested against many connection-string shapes). On an unexpected error it does not repeat the driver's message, which can name the database user.
- The shared code moved out of `tests/` into `src/lib/db/` (`identity.ts`, `verify-schema.ts`), because the Docker context excludes `tests/` (D-046). Scripts run directly by Node import it with a `.ts` extension (`allowImportingTsExtensions`; tsconfig already has `noEmit`).

**What it does not check:**
- **Column-level drift:** missing, extra or changed columns, types, nullability and defaults.
- Enums, indexes, constraints and foreign keys.
- Tables that should not be there (the test-only tables from D-050 are expected, but are not required by the deployed config).
- Data.
- A migration file that was edited after it ran under the same name. The names are compared, not the contents.
- Schemas other than `public`.
- Anything newer than the checked-out commit. A checkout newer than production reports production's missing migrations, as it should.

**Why:**
- A migration that half-applied, a database restored from an older dump, or `prodMigrations` silently not running would otherwise show up only as errors on pages.
- Table and migration names catch those cases cheaply. A full schema diff against the Drizzle snapshot would cover column drift, but needs much more code. Revisit if drift is ever seen.

### Part 2: the startup check, the boot-time start, no database creation (2026-10-20)

**Findings in Payload 3.90.2's source:**
- **Migrations finish before the server checks anything.** `BasePayload.init` (`payload/dist/index.js`) awaits `db.connect()` before it runs `onInit`. The Postgres adapter's `connect()` (`@payloadcms/db-postgres/dist/connect.js`) ends by awaiting `migrate({ migrations: prodMigrations })` when `NODE_ENV` is production. A migration that throws makes Payload call `process.exit(1)` itself (`@payloadcms/drizzle/dist/migrate.js`).
- **Payload starts lazily,** on the first `getPayload` call, which in a Next.js server means the first request. A failed start clears Payload's cached promise, so every later request starts it again: a new connection pool and another migration attempt each time.
- **A retried `getPayload` skips `onInit`.** Payload keeps the cache entry from the failed attempt and treats the retry as "already initialised". So a check placed in `onInit` could be skipped after a retry.
- **Payload creates a missing database.** `connect()` runs `CREATE DATABASE` when the database does not exist (`createDatabase.js`), unless `disableCreateDatabase` is set.
- **No lock around migrations.** `migrate.js` reads `payload_migrations`, then runs each pending migration in its own transaction. Nothing (no advisory lock, no table lock) stops two servers from doing this at the same time.

**Decision:**
- **Start at boot** (`src/instrumentation-node.ts`, called from `register()`, production only, skipped during `next build`). Next.js awaits `register()` before the server takes requests, so migrations and the check run before any visitor arrives.
- **The startup check** (`checkDatabaseAtStartup`, `src/lib/startup.ts`) runs right after `getPayload` resolves, so after `prodMigrations`.
  - It verifies every table the config defines and every migration record (`verifyDatabaseSchema`, the same check as db:verify).
  - If anything is missing, it logs one `ERROR` line naming only the missing tables and migrations, and the server exits with code 1.
  - Then it logs the `SECURITY: there are no user accounts` error if there are none. That was in `onInit` and only appeared on the first request.
  - It is not in `onInit`, because of the retry finding above.
- **What happens on failure** (`startWithRetry`, `src/lib/boot.ts`):
  - **schema incomplete:** exit 1 at once;
  - **database missing:** exit 1 at once;
  - **database unreachable** (Payload's "cannot connect to Postgres"): six attempts, with waits of 1, 2, 4, 8 and 15 seconds (about 30 seconds), then exit 1. A brief outage or database restart does not crash the server, and a long one does not keep it hanging;
  - **anything else:** exit 1 at once.

  The host's restart policy decides what happens after an exit. Each attempt takes at least about 30 seconds, so there is no tight crash loop.
- **Messages:** every message from the startup code is fixed text plus attempt counts and table or migration names. None repeats an error's message, so none can contain a URL, user name or password. `tests/unit/boot.spec.ts` feeds in errors that do contain a URL, user and password, and checks that they never come out.
- **`disableCreateDatabase: true`.** A mistyped database name now stops the server ("does not exist"). Before, it would have produced an empty database, run every migration into it, and left first-register open to anyone. Nothing relied on auto-creation: CI's container creates `ogserc`, the workflow creates `ogserc_e2e` with `psql`, docker-compose uses `POSTGRES_DB`, and Neon branches come with their database.
- **Several instances:** because Payload takes no lock, two instances starting together can both run the same pending migration. One then fails and exits, and a migration that doesn't fail on a second run could apply twice. **Apply migrations in one deploy step before traffic starts** (RUNBOOK Section 3): run `pnpm migrate` from a full checkout of the deployed commit, or start one instance and scale out once it is healthy.
- **On Vercel,** `register()` runs once per cold start of each server instance. That adds a few small queries to each cold start, and the instance-concurrency rule above applies.

**Tested in CI** (e2e job, throwaway Postgres container only; each step prints the server's output and fails on any `postgres://` in it):
- **A write in db:verify's read-only session is refused** (`scripts/ci/read-only-probe.ts`). `CREATE TABLE`, `INSERT` and `CREATE DATABASE` must each fail with SQLSTATE 25006, then a normal session confirms nothing was written.
- **`pnpm build` with `DATABASE_URL` on a port where nothing listens** succeeds, so the build never connects. The same was shown locally on 2026-10-20.
- **Incomplete database** (all migrations recorded, `media` dropped): the server exits non-zero with `Missing tables: media.` and the incomplete message.
- **Missing database:** the server exits with the "does not exist" message, and the database was not created.
- **Unreachable database** (port 5999): the server retries five times and exits with the unreachable message.
- **Brief outage:** Postgres is stopped, the server starts and reports attempt 1, then Postgres is restarted. The server must report that it started and answer `/api/users/init` (which needs the database). A cleanup step restarts Postgres whatever happens.
- A step that times out fails with "did not exit within …s" and prints the log.

**Not verified:**
- Vercel's cold-start behaviour.
- Whether the boot-time `getPayload` shares its cached instance with the route handlers. Check for one `Database:` log line per server start in the CI server log.

### Part 3: `pnpm migrate` must confirm itself (2026-10-20)

**What happened:** on the first CI run of part 2 (a47ddb1), "Verify the database after migrations" failed. For `ogserc` on `localhost:5432` it reported all 10 tables missing and all 3 migrations unrecorded, straight after `pnpm migrate` had passed.

**How the cause was decided** (the CI logs could not be read from the developer's machine, so this rests on the workflow file and Payload's source):
- **Not a different database (b).** Neither step sets step-level variables, so both get the same job-level `DATABASE_URL`, `TEST_DATABASE_URL`, `SITE_URL` and `PAYLOAD_SECRET`. Neither finds a `.env` file in CI, and db:verify reported the database `pnpm migrate` targets.
- **Not the wrong schema or place (c).** db:verify reads the `public` schema, where Payload's adapter creates its tables, with the same code that found 10 tables and 3 migrations on the Neon dev database. A missing `payload_migrations` table explains why all 3 migrations were reported as unrecorded.
- **So (a): `payload migrate` exited 0 without applying anything.** That is the silent exit already seen with `payload run` (D-047), whose Watch note named `pnpm migrate` in CI as a likely case.
- **Why no earlier run noticed:** before part 2, the production server applied `prodMigrations` itself on its first request during `pnpm test:e2e`, so the tables appeared anyway. db:verify is the first step that looks at `ogserc` before any server starts.
- **Why the test database was fine:** its reset applies migrations through `payload run` with a confirmation file (D-047), and has been passing in CI.

**Decision:**
- **`pnpm migrate` is now `scripts/db-migrate.ts`.**
  - It runs `scripts/db-migrate-payload.ts` through `payload run`.
  - That script checks the live connection is the database in `DATABASE_URL`, applies the compiled migration list from `src/migrations` (the same list the server applies as `prodMigrations`), runs the same schema check as db:verify, and only then writes a confirmation file.
  - The wrapper deletes the file before each attempt and counts success only from a fresh one, with one retry (migrating is idempotent). Otherwise it fails with "Exited with code 0 but did not confirm that it ran (attempt 2 of 2)".
  - A migration that fails still makes Payload exit with code 1.
  - `--show-target` works as for db:verify.
- **Shared code:** both wrappers use `scripts/confirmed-run.ts`. The confirmation variable is now `DB_SCRIPT_CONFIRM_FILE` for both.
- **Payload's own command** remains available as `pnpm payload migrate`, without this protection. Only use it to diagnose.
- **db:verify stays a separate CI step.** It is read-only and independent of the migrate script, so a fault in the new migrate path is still caught.

**Not verified:** why `payload migrate` stalled in CI. That needs the step's log. The fix does not depend on the reason.

### Part 4: the boot check uses its own Payload instance (2026-10-20)

**What happened:** on the CI run for 7c2a685, one database test failed: `tests/e2e-db/media.spec.ts` "HEIC and HEIF files are rejected". It expected the Media hook's staff message and got `{"errors":[{"message":"The following field is invalid: file"}]}` (400). The test had passed on every run before part 2.

**Cause (from Payload 3.90.2's source and the production build output):**
- Payload's REST error handler (`routeError` → `formatErrors`) includes an error's `name` and `data` (where the per-field messages are) only if `err instanceof ValidationError` or `APIError`. Otherwise it returns `{ errors: [{ message }] }`, exactly the body CI received. So the hook ran and threw its message, but the details were dropped.
- `instanceof` failed because there were **two copies of Payload in one server process**. The production build bundles Payload into each server entry. The instrumentation entry has its own copy of Payload and of our config, Media hook included, in chunks separate from the API route's copy. That was confirmed by searching `.next/server/chunks` for Payload's `ValidationError` and the Media hook.
- `getPayload` caches its instance on a **process-wide global** (`global._payload`). So the instance created at boot (part 2) was also the one every route handler got. Its hooks threw the instrumentation copy's `ValidationError`, which the route copy's `formatErrors` did not recognise.
- Status codes and top-level messages survived, so only tests that read an error's details failed.
- **Q: do the boot-time `getPayload` and the route handlers share one instance?** Yes, they did, and that was the bug.

**Decision:**
- The boot check (`startPayloadAtBoot`) creates its own instance (`new BasePayload().init({ config })`), runs the startup check, and closes it (`destroy()`, also after a failed attempt). It never calls `getPayload`.
- Route handlers then start their own instance from their own bundle on the first request, as they did before part 2.
- The migrations have already run at boot, so the second start finds nothing pending.
- Expect **two `Database:` lines per server start**: one from the boot check, one when the first request starts the routes' instance.
- Retries are cleaner too: each attempt is a fresh instance with its own `onInit` and its pool closed.

**Tests that pin it:**
- The media test, unchanged.
- `tests/e2e-db/users.spec.ts` "a validation error keeps the details of the field that failed": a 400 from Payload's own field validation must keep the `roles` field path and a field-level message in `data.errors`. The test prints the status and body on every run.
- `tests/unit/boot.spec.ts`: `src/instrumentation-node.ts` never calls `getPayload`, and it destroys its own instance in a `finally`.

**Watch:** any other code that runs outside the route handlers and calls `getPayload` in the same process would hit the same problem. Examples: another `register()` step, or a job runner started at boot. Give it its own instance, or call it only from route code.

**Error names in the production build (2026-10-20):**
- The first version of that test also asserted `errors[0].name === 'ValidationError'`. It received `"A"`.
- **Why:** Payload sets an error's name from its class (`this.name = this.constructor.name`, `payload/dist/errors/APIError.js`), and the production build minifies class names. In `.next/server/chunks` the class is `class A extends h.f{…"error:followingFieldsInvalid"…}`. So error names are not stable in production.
- **The fix still works:** `formatErrors` only adds a `name` on its `instanceof` branch, which always includes `data`. The fallback branch of the part 4 bug had no `name` at all, so a name of "A" itself shows the error was recognised. The media tests (their message is only in `data.errors`) pass.
- **Rule:** never compare an error's `name` or `constructor.name`, in code or tests. Compare status codes, `instanceof` against the same copy of Payload, or our own `code` property (as `classifyStartError` does).
- **Checked on 2026-10-20:**
  - The only such comparison in `src/`, `tests/` and `scripts/` was this assertion. Other matches are Playwright project names or a document's `name` field.
  - The drafts scenario records `name: message` but only checks whether an error happened, and runs unbundled.
  - Payload's only runtime name comparison is `formatErrors`' Mongoose fallback, which our errors never reach.
- The Step 3 lockout rewrite (an `afterError` hook) must follow this rule.

**Depends on Payload 3.90.2 (re-check after every Payload upgrade, including Dependabot PR #17):** the part 4 fix relies on Payload internals that a release may change:
- `BasePayload` being exported, with `init({ config })` and `destroy()`;
- `getPayload` caching on the process-wide `global._payload`;
- `formatErrors` using `instanceof`;
- the adapter's `connect()` applying `prodMigrations` before `init` resolves;
- Payload being bundled separately into the instrumentation entry.

After an upgrade, before merging:
- read those parts of the new source;
- rebuild and check `.next/server/chunks` again;
- confirm in CI that the media and error-details tests pass, with two `Database:` lines per server start in the database test log.

## D-052 Staff sign-in and account safety: sessions, cookies, CSRF, lockout, last administrator (2026-10-21)

Step 3 plan commit 2, in seven code commits plus this one (`f881738`, `407ee4e`, `4b171f6`, `7a0caf7`, `4582f40`, `2f171dd`, `edf077a`, `71fa28e`). Each was tested in CI on the production build. The settings are pinned in the assembled config by `tests/unit/users-auth.spec.ts`.

### What Payload 3.90.2 does (read in its source)

- **Defaults:** `maxLoginAttempts` 5, `lockTime` 10 minutes, `tokenExpiration` 7200 s, sessions on, API keys off, cookie `SameSite=Lax`, HttpOnly always, `Secure` off.
- **Sessions:** the token check (`auth/strategies/jwt.js`) only looks for the token's session id in the account's `sessions`; it never reads the session's age. Each refresh extends the session again, so an active session never ended.
- **Password changes** end sessions already: an update that sets a password keeps only the caller's own session (`collections/operations/utilities/update.js`), and reset-password clears all. **A role change ended none.**
- **Failed sign-ins:** an unknown email or a wrong password gives "The email or password provided is incorrect."; a locked account gives "This user is locked…". Both 401, so the message showed whether an account exists.
- **CSRF** (`auth/extractJWT.js`): only cookie-authenticated requests are checked. The `Origin` header is compared as a string with the `csrf` list, to which Payload appends `serverURL` as written. Without `Origin`, `Sec-Fetch-Site` must be same-origin, same-site or none. The `Authorization` header is not checked.
- **`removeTokenFromResponses`** removes the token from REST and Local API login, me, refresh and reset-password. First-register signs in through the Local API login, so it returns no token and an empty cookie too.
- **Bulk update and delete** process their documents **in parallel** within one shared transaction (`collections/operations/update.js`, `delete.js`), unless the adapter's `bulkOperationsSingleTransaction` is on (it is off). A transaction always exists before `beforeOperation` runs, and `beforeOperation` runs before access is checked.
- The Local API `unlock` is typed as needing a password but reads only the email (`auth/operations/unlock.js`).

### Decision

| Setting | Value | Why |
|---|---|---|
| Token | 1 hour (`tokenExpiration: 3600`) | Short-lived; the admin refreshes it while in use (below). |
| Absolute session limit | 12 hours from sign-in (`limitSessionAge`, `src/lib/auth/session-cap.ts`) | A refresh is refused (403) unless the new token would end before 12 hours from sign-in, so no token outlives it. The start time is read from the database in the request's transaction. |
| Token in responses | never (`removeTokenFromResponses: true`) | Only in the HttpOnly cookie, out of reach of page scripts. |
| API keys | off (`useAPIKey: false`, explicit) | No long-lived credentials for staff. |
| Cookie | `HttpOnly`, `SameSite=Strict`, `Secure` when `NODE_ENV=production` (unchanged) | The admin is same-origin, so the cookie is never needed cross-site. |
| CSRF | `csrf: [origin of SITE_URL]`, and `serverURL` the same origin (`siteOrigin`, `src/lib/env.ts`) | Payload compares strings, so a `SITE_URL` with a trailing slash or path would have refused every cookie sign-in. Shown: with the raw value, the same-origin test failed. |
| `SITE_URL` in production | must be https; plain http only for localhost, 127.0.0.1, [::1] | `Secure` cookies and passwords never sent unencrypted. CI and the Docker check use localhost. |
| Lockout | 5 failures, 15 minutes | Slows password guessing; an administrator can unlock sooner. |
| Failed sign-in reply | one fixed 401 body for every failure (`genericLoginError`, an `afterError` hook) | It says nothing about whether the account exists or is locked. Decided by the endpoint (POST `/api/users/login`) and the status (`error.status`), never the error's class or name (D-051). Shown: without it, the locked replies differed. |
| Emergency unlock | `pnpm auth:unlock <email>` | For when no administrator can sign in. Same guards as `db:verify` (RUNBOOK 4.1). |
| Role change | ends every session of that account (`endSessionsOnRoleChange`) | The person signs in again under the new roles. Shown: before, the old session still worked. |
| Self-delete | refused (`isAdminNotSelf` delete access, plus a `beforeDelete` second layer) | Nobody removes themselves by mistake, alone or in a bulk delete. |
| Last administrator | the whole operation is refused (409) if it would leave none (`protectLastAdministrator`, `src/lib/auth/last-administrator.ts`) | Decided once per operation over **all** its targets, under a transaction-scoped advisory lock, because bulk documents run in parallel and the lock is re-entrant within a session. The signed-in caller is not counted as removed when access is enforced, because Payload already refuses their own role change and deletion. Also applies to trusted code. |

**Last administrator, shown in tests:**
- Two administrators demoting, or deleting, each other at the same moment: one 200 and one 409 in every one of 5 rounds, and exactly one administrator left.
- Without the rule, and again with the count but without the lock, the first round returned 200 and 200, leaving none.
- A REST bulk demote or delete matching every administrator leaves exactly the sender; the same through the Local API with a user leaves exactly that user.
- Trusted code removing every administrator is refused whole and changes nothing (rather than keeping exactly one: choosing who survives is not the code's job).

### What the admin panel does (observed 2026-10-20, temporary 5-minute token, not committed)

- **Refresh:** only on a page change in the token's last 2 minutes. Typing or scrolling does not count.
- **Warning:** otherwise a "Stay logged in" dialog opens 1 minute before the end ("Stay logged in" / "Log out").
- **At the end:** with no answer, it moves to `/admin/logout-inactivity`, then the login page.
- **First user:** after "create first user" the screen goes to `/admin` and then cleanly to `/admin/login`, with no error; the new administrator signs in. (This corrects the plan, which said first-register would still return a token.)

### Trade-offs and open items

- **Anyone who knows a staff email can lock that account for 15 minutes at a time.** Rate limiting (D-081) slows guessing but cannot prevent this: any per-account protection can be triggered by someone else. Two-factor authentication (Step 3 plan commit 6) makes a guessed password useless on its own. Keep at least two administrators; `pnpm auth:unlock` is the emergency route (RUNBOOK 4.1).
- **Timing:** unknown and locked accounts are answered faster than a wrong password, because no password hash is computed, so response time can still hint that an account exists. Rate limiting reduces how much can be learned this way; a constant-time reply is not implemented.
- **Strict cookies:** a link to `/admin` opened from email or chat (a cross-site navigation) arrives without the cookie, so the page shows the login screen until it is reloaded or the person signs in.
- **Open: unsaved work at sign-out.** The forced page change at the token's end, and the 12-hour limit's sign-out (a refused refresh, which goes straight to the inactivity page with **no** warning), can discard what someone typed in a long form. To be tested with a filled-in form before Step 4, then decide between a longer token (for example 4 hours; the owner leans this way for now), a refresh mechanism, or autosave or draft recovery. Also in STATUS.md.
- **Unverified:** how the admin panel shows the last-administrator 409 (for example when demoting the last administrator from the edit screen).
- **Re-test with two-factor authentication:** Strict cookies must be checked again with the 2FA plugin (its verification cookie and redirects, plan commit 6).

### Watch (re-check after every Payload upgrade, including Dependabot PR #17)

This decision relies on Payload 3.90.2 behaviour that a release may change:
- the CSRF comparison in `extractJWT` and `serverURL` being appended to `csrf`;
- `afterError` receiving the original error, and the HTTP status being `error.status`;
- `beforeOperation` receiving `operation` (`update`/`delete` also for by-id), `overrideAccess`, and `args.id` or `args.where`, before access is checked;
- bulk documents processed in parallel in one transaction;
- the `sessions` array with `createdAt`, and refresh not checking a session's age;
- `removeTokenFromResponses` covering the Local API login (and so first-register).

The D-051 boot fix (its own `BasePayload` instance) still applies and has its own list in D-051.

## D-053 Staff password policy, enforced on every path that sets a password (2026-11-19)

(Numbered in order but written after D-054 to D-080: the code cited it from 2026-10-21.)

**Decision:** A staff password has 12 to 128 characters (code points) and must not contain "ogserc", the email's local part (if 3 or more characters) or any piece of it of 4 or more characters, and must not be in SecLists' 10,000 most common passwords (`data/common-passwords/`, MIT). The rules are in `src/lib/auth/password-policy.ts` and checked by `src/lib/auth/enforce-password-policy.ts` in three hooks on the Users collection:
- `beforeValidate` on create (including the first user) and on any update that sets a password, checking both the stored and the submitted email;
- `beforeOperation` refusing a bulk update (by query) that sets a password, whatever the password;
- `beforeOperation` on `resetPassword`, which finds the account by the same token query Payload uses next and checks the new password before Payload hashes it.

There is no exemption: trusted server code with `overrideAccess` obeys it too. If the common-passwords list cannot be read, passwords are refused (500), never accepted unchecked. Refusals are a 400 on the `password` path with fixed messages that never include the password.

**Why:**
- **Length over composition rules** (NIST SP 800-63B): a minimum of 12 and a list of known-bad passwords stop the guessable ones without forcing patterns staff then write down. The 128 maximum bounds hashing work; strings over 512 UTF-16 units are refused before they are counted.
- **A hook on Payload's own reset instead of a replacement endpoint** (the plan's first idea): Payload's `beforeValidate` on reset runs after it has already hashed the password, so a check there is too late, but `beforeOperation` sees the password first. Keeping Payload's endpoint keeps its token handling, expiry and session behaviour. With no valid token the hook does nothing, so Payload's own 403 follows and the reply never depends on the password. A refusal rolls the transaction back, so the same link works for a corrected password.
- **No bulk password changes:** one password for many accounts is never legitimate, and refusing it keeps every password check to one account at a time.
- **Tests:** unit tests for each rule; `tests/e2e-db/password-policy.spec.ts` for every REST path (create, own change, administrator change, email change, bulk, reset link, invalid link) and, through `tests/support/password-probe.ts`, the Local API with `overrideAccess`.

**Breach check (added 2026-11-19):** after every local rule passes, `src/lib/auth/breach-check.ts` asks Have I Been Pwned's Pwned Passwords range API whether the password has appeared in a data breach, and refuses it if so. Only the first 5 characters of the password's SHA-1 hash leave the server (k-anonymity); `Add-Padding` hides even the reply's size; no API key or account is needed; built-in `fetch` and `crypto` only, no new library.
- **Fails open:** if the service cannot answer within 3 seconds, or answers with anything but 200, the password is accepted on the other rules and a fixed warning (no password) is logged. A failure elsewhere must not stop staff from setting or resetting a password, and the common-passwords list still applies. A fail-closed check would turn an outage at a third party into a lockout here.
- **`PASSWORD_BREACH_CHECK=off`** skips it. The database tests set it (they never call the service; the check has its own unit tests with a fake fetch). The server warns at startup if it is `off` in production.
- **Privacy:** the 5-character prefix matches hundreds of unrelated hashes, so neither the service nor anyone watching learns the password. No account, email or other personal data is sent. The server needs outbound HTTPS to `api.pwnedpasswords.com`.

**Watch (re-check after Payload upgrades):** `resetPassword` calling `beforeOperation` with the plain password in `args.data` before hashing, and finding the account by `resetPasswordToken` and `resetPasswordExpiration` (Payload 3.90.2, `auth/operations/resetPassword.js`).

## D-054 First deploy: OGSERC's VPS with Docker Compose and Caddy, as a closed preview (2026-10-28)

(Written on `main` while Step 3 was unmerged. D-053, the Step 3 password policy, is written above.)

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

**Hero and favicon (same day):** slide 1's headline is OGSERC's tagline "Electricity for all in Ogun State", and its button reads "Learn more", with "about OGSERC" added for screen readers (WCAG 2.4.4), pointing to About Us (the "being prepared" page until About is built). The headlines on slides 2 and 3 were drafted for the owner to match their buttons. The introduction on slide 1 ("Transparent oversight and robust regulation of Ogun State's power sector.") reuses the words of OGSERC's footer summary. The favicon (`src/app/icon.png`) and home-screen icon (`src/app/apple-icon.png`) are the logo's "O" with the Ogun State map, cut from `public/brand/ogserc-logo.png`. At tab size the full wordmark would be unreadable. They are static files, so they need no image processing on the VPS (D-056).

**Tests:** the header-and-footer link test fetches only the site's own links and checks email, phone and social links by their form, so it never depends on another site being up.

## D-058 The office map loads only when the visitor asks (2026-10-29)

**Decision:** The office map (homepage contact section, and the contact page when it is built) is a panel with "Show map" and "Open in Google Maps". Google's embedded map (`www.google.com/maps/embed`, no API key) loads only after "Show map" is pressed, and focus then moves to it. Without JavaScript only the link shows. The link is OGSERC's own Google Maps link. The embed address uses the place it resolves to (OPIC Tower, 7.1344754, 3.3396073). Both are in `placeholder-content.ts` with the other contact details (D-057). Chosen by the owner over an always-loaded map or a link only.

**Why:** an always-loaded Google map adds roughly 1 MB on mobile data and sets Google cookies on every visit (which would need a cookie notice, FR-WEB-06). Loading on request keeps pages light (NFR performance), and nothing goes to Google unless the visitor chooses. No library is needed. The component is a small client component in `src/components/ui/OfficeMap.tsx`.

**Later:** the strict CSP (build step 12, D-011) must allow `frame-src https://www.google.com`. The privacy notice should say that showing the map loads content from Google. If OGSERC prefers the embed address from Google Maps' "Share > Embed a map", replace `embedUrl` only.

**Tests:** `tests/e2e/office-map.spec.ts` checks that no request goes to Google before the click (Google is never reached from tests; the embed is answered locally), that the map appears and takes focus after it, and that only the link shows without JavaScript.

## D-059 Contact page and enquiry form, before email sending exists (2026-10-29)

**Decision:** `/contact` (SRS 6.12) follows the layout the owner chose from a reference screenshot: a dark green header band ("Get in touch", "Contact OGSERC"), then Head office, Department contacts and Office hours cards beside a "Send a message" form, then the office map (D-058). OGSERC supplied the inbox (`info@ogserc.org.ng`), the consumer complaints address (`ccu@ogserc.org.ng`), the licensing and registration address (`registration@ogserc.org.ng`) and the hours (Monday to Friday, 8:00am to 5:00pm). The introduction and department descriptions were drafted and the owner agreed the enquiry types. Weekends and public holidays are shown as closed. No reply time is promised, because none was given. Content sits in `placeholder-content.ts` with D-057's details, for the step 4 seed.

**Form:** a server action (`src/app/(frontend)/contact/actions.ts`) with `useActionState`, so it works without JavaScript (full page load) and with it (focus moves to the result or to a GOV.UK-style error list). Validation is in `src/lib/contact/enquiry.ts` and runs on the server: name, email and message required, formats for email and phone, lengths, enquiry type from the list. Single-line fields have line breaks collapsed, so nothing typed can add an email header later. The browser's own validation is off (`noValidate`) so every visitor sees the same messages. Nothing typed is logged.

**Spam protection (owner's choice: invisible checks, not Cloudflare Turnstile):** a hidden trap field (a bot that fills it is told "sent" and nothing is kept), and a signed timestamp issued with the page (`src/lib/contact/form-token.ts`, an HMAC with a key derived from `PAYLOAD_SECRET`). A form sent within 3 seconds, after 24 hours, or with a changed token is asked to send again, keeping the message. The page therefore renders per request (`connection()`).

**Sending (owner's choice: decide later):** no email is sent yet. A valid message gets "the online form cannot send messages yet" and an "Email your message" `mailto:` link that carries the subject and message, so nothing typed is lost. Rate limiting is also deferred: there is nothing to limit until the form sends. **Before sending is switched on**, the sending slice must add rate limiting (CLAUDE.md security rules), a configurable inbox in an environment variable (FR-CNT-02), the confirmation message, and the domain's SPF, DKIM and DMARC (launch checklist item 13). The choice is between OGSERC's Microsoft 365 (SMTP AUTH on one mailbox) and a sending service.

**Measured (D-041):** the homepage's JavaScript went from 186.0 KB to 186.5 KB gzipped with the map component (production build). The contact page adds nothing to the homepage.

## D-060 The first Order, published before the Documents collection exists (2026-10-29)

**Decision:** OGSERC's first Order, *Order on the Commencement of Operations of the Commission and the Mandatory Registration of Licensees and Electricity Operators in Ogun State, 2026* (OGSERC/ORD/2026/001), is published at `/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001`. A listing page (`/regulatory-instruments/orders-and-directives`) shows it as a card. Both follow the reference screenshots the owner supplied, with OGSERC's design system. The owner chose this over waiting for Step 3 and the Documents collection (option A). The documents are listed in `src/lib/documents/catalogue.ts`, a temporary exception like D-028. Its fields follow FR-DOC-02, so step 6 can move each entry into the CMS unchanged. Only non-draft documents are ever listed or served.

**The files:**
- **Signed copy.** OGSERC's scan is 20 pages, 14.3 MB, with no text layer. The site serves a 150 dpi copy built from the same page images (2.5 MB, checked legible, with the title and language set in the PDF properties) at `public/documents/orders-and-directives/ogserc-ord-2026-001.pdf`. The full-resolution scan is not in the repository: it would add 14 MB to git history for good. It can be offered once object storage exists.
- **Full text.** It comes from OGSERC's Word file. A conversion script turned it into structured blocks (headings, sub-paragraphs, the definitions list, the schedule tables, the signatories) in `src/lib/documents/text-ogserc-ord-2026-001.ts`. The text was compared with the signed scan: dates, every fee in Schedule 3, the filing email and the wording match. The word count of the page text equals the Word file's, apart from the title lines shown in the page header and Word's formatting codes. Two paragraphs split by page breaks in the Word file (8(5) and 18(5)) are joined. The wording must not be edited by hand; corrections come from OGSERC as a new file.
- **Not committed.** Neither the Word file nor the original scan is committed. Both stay in the git-ignored `incoming/` folder.
- **Signatures.** The signed copy shows the signatures of the Chairman/CEO and the Secretary, and initials on every page. The owner confirmed OGSERC is content for it to go online, as paragraph 27 of the Order requires publication on the website. The web text lists the signatories' names and roles, not their signatures.

**Page design and how it differs from the reference:**
- **Status.** Status uses the SRS set (Published, Superseded, Revoked), not "Active".
- **No download counts.** These would need visitor tracking (FR-WEB-07 allows only privacy-friendly analytics).
- **Summary.** The summary is paragraph 1 (Citation) of the Order itself, so nothing is written for it. "Questions?" points to `registration@ogserc.org.ng`, the address paragraph 10(2) gives for filings and enquiries.
- **PDF preview.** It shows only at 1024px and wider (`PdfPreview.tsx`, with Hide and Show): most phone browsers cannot show a PDF in a page, and a phone should not download 2.5 MB unasked. Phones get Open and Download buttons.
- **Full text.** It has a Contents list and anchors for each Part, paragraph and Schedule (`#paragraph-10`). Its tables scroll sideways on narrow screens inside a focusable region.
- **Category sidebar.** It lists the eleven SRS Regulatory Instruments categories from `navigation.ts`, with counts. It is a sideways-scrolling row of pills on phones.
- **Not yet built.** Filters (FR-DOC-04) and related documents wait for more than one document (step 6).

**Shared pieces:** the dark header band (`PageBand`) and white sidebar cards (`Panel`) are now components, also used by the contact page.

**Found in review:** at 360px both pages first scrolled sideways (about 1,400px wide). The hidden screen-reader count in each category pill is positioned absolutely; with no positioned ancestor it escaped the scrolling row. The grid column also grew to fit the row. Fixed with `relative` on the links and `min-w-0` on the columns. A test now checks that neither page scrolls sideways at 360px.

**Later:** the strict CSP (step 12) needs `frame-src 'self'` for the preview. Site search (step 10) should index the full text, which is why the text is kept as data, not only in the PDF.

## D-061 "Our Mission" becomes "Vision, Mission & Values", one page (2026-10-29)

**Decision:** The About OGSERC menu item "Our Mission" (SRS Section 4) is renamed **Vision, Mission & Values** and opens one page at `/about/mission`. The page shows OGSERC's vision, mission and five values (PRIDE: Predictability, Responsiveness, Integrity, Data, Excellence), with anchors `#vision`, `#mission` and `#values`. The owner supplied the wording, and it is used as given, except that each value's description starts with a capital because it stands on its own. The menu keeps four items. The content sits in `placeholder-content.ts` with the other OGSERC-supplied details (D-057), for the step 4 seed.

**Why:** the owner first suggested adding "Our Vision" beside "Our Mission", with both opening the same page. That would put two menu links to one page, which can look like a mistake, and screen-reader users hear two different link names for the same place. One item named for everything on the page avoids both. The three statements are short and read best together.

**Sitemap change note (SRS 2.5):** this changes the wording of the approved Section 4 sitemap; no page was added or removed. OGSERC to confirm in writing with the other sitemap items at sign-off.

## D-062 Homepage: real updates only, Tenders and Events hidden, taller hero on phones (2026-10-30)

**Decision:** Following the owner's review of the live preview:
- **Latest updates** shows only real items. The six sample news cards are gone. The one item is Order OGSERC/ORD/2026/001, linking to its page. The registration forms come next. The items sit in `latestUpdates` in `placeholder-content.ts` until the News collection exists (step 9). With a single item, the row has no focusable scroll region (there is nothing to scroll to) and the card fills a phone's width. From two items on, the scroll-snap row (D-030) comes back on its own.
- **Tenders** and **Events** are hidden from the homepage until OGSERC has real ones. The components and sample data stay, so bringing them back takes one line each in `page.tsx`. FR-WEB-02 lists both sections, so they must return or be signed off as removed before launch.
- **Hero** is at least 70% of the small viewport height (`70svh`) on phones, with the slide content centred vertically. From 640px up it keeps its content height. `svh` rather than `vh`, so the hero does not jump when the mobile browser's address bar hides.

- **Public notices** keeps its section but shows only real notices: the Order's publication on the website (30 October 2026), linking to the Order. The second notice, that the registration forms are available to download, is added when the forms are published, so the site never announces something it does not have yet.
- **Added with the forms (D-063):** a Latest updates card and a Public notice for the registration forms, both linking to `/regulatory-instruments/forms`. With two updates the scroll-snap row is back.
- **"View all news"** still points to the news page, which step 9 builds (owner's choice).

## D-063 Registration forms as static Word files, before the Documents collection exists (2026-10-30)

**Decision:** The eleven registration forms (REG-01A to REG-01K, Version 2026.1) under the Commencement and Registration Order (OGSERC/ORD/2026/001) are published at `/regulatory-instruments/forms` as static Word files in `public/forms/registration/`, with OGSERC's exact file names. The page shows the Registration Form Selection Guide as text first, then the forms A to K, each with one Word download, then how to submit. The source files are kept unchanged in `docs/source/` (the guide's Word file and its verbatim Markdown text). They are only for the record and the tests; the page does not read them, and Docker leaves `docs/` out of the image.

**Why:** the Order is in force from 2 November 2026 and operators need the forms now. The Documents collection (step 4) does not exist yet. This follows D-060 (the Order as a static PDF).

**Rules, from the owner:**
- **Two ways to submit, no other:** by hand at the Commission's Registry, or by email to `registration@ogserc.org.ng`. The page never mentions an online portal. Paragraph 24 of the Order says the Commission *may* issue one; that is the Order's own text, on the Order page only.
- **Word only.** No PDF versions and no preview in this round, on purpose. Both can be added later (a PDF per form, and D-060's desktop preview).
- **The guide is text on the page only.** No download of the guide, and no Word or PDF version of it on the site. Its wording, amounts and paragraph references are used exactly as in `docs/source/registration-guide.md`, and a test compares the page with that file. Its closing italic line ("Forms are available from…") is left out; the "How to submit" box replaces it.
- **Link text** uses each form's own title in sentence case (form D: "Generation of 1 MW to below 10 MW"). "Who it is for" uses the guide's wording ("1 MW to less than 10 MW"). Both are OGSERC's.
- **Sizes** are read from the files when the page is built, never typed in.
- **Guide table on phones:** below 640px each row shows as a card (the category letter large, then "Who registers", "Form" and "Fee" with small labels). The table keeps its caption (the guide's subtitle), `<th scope>` cells and explicit table roles, because some browsers drop table semantics when rows change display; the header row stays for screen readers only, and the small labels are hidden from them so nothing is read twice. Each form code links to that form's entry (`#reg-01c`). From 640px it is an ordinary table.
- **Office hours** on the page reuse the contact page's 8:00am to 5:00pm (owner, 2026-10-30).
- **Registry address** uses the guide's wording, "5th and 6th Floors, OPIC Building, Oke-Ilewo, Abeokuta". The footer's "Floors 5 & 6, OPIC Towers" is also correct (owner); they need not match.

**Exception to lowercase URLs (CLAUDE.md Conventions):** the download addresses keep OGSERC's file names, with capitals and underscores, for example `/forms/registration/OGSERC_Form_REG-01C_Generation_10MW_and_above.docx`. The rule is for page addresses; these are file addresses, and the owner asked for the names unchanged so the downloaded file matches the Registry's copy.

**Step 4:** the forms move into the CMS Documents collection, category Forms. The same public download addresses must keep working, or redirect permanently to the new ones, because they will be shared in emails and letters. `*.docx` is marked binary in `.gitattributes` so git never alters the files.

## D-064 About Us, Our History and OGSERC's Structure, before the Pages collection exists (2026-11-01)

**Decision:** The remaining three About OGSERC pages go live with text the owner supplied on 2026-11-01: `/about` (About Us), `/about/history` (Our History) and `/about/structure` (OGSERC's Structure). The text sits in `placeholder-content.ts` (`aboutUs`, `ourHistory`, `ogsercStructure`) beside the vision and mission (D-061), for the step 4 seed. All four About pages share a row of section links under the page band (`AboutNav`), so a visitor can move between them without reopening the menu.

The text is used as given, except for these changes, all confirmed by the owner on 2026-11-01:
- **Typo:** "Executive Chaiman" is corrected to "Executive Chairman".
- **Division name:** the text lists "Legal, Licensing, Consumer and Consumer Affairs"; the organogram says "Legal, Licensing and Consumer Affairs". The page uses the organogram's name.
- **Short titles on "What we do"** (Licensing, Tariffs, The Ogun State Electricity Market, Performance, Consumer protection, Regulations, codes and standards) are ours, drawn from each item so the cards can be scanned. OGSERC can still change them.
- **Key dates** on Our History repeat the dates already in the text, as a timeline. Nothing is added.

**Organogram:** drawn in HTML from the owner's organogram image, not shown as the image. Headings and lists are read by screen readers and by site search, scale to a 360px phone, and need no alt text that could fall out of step. The Office of the Chairman (one of the five divisions in the text) holds the three units the organogram draws beside the Chairman / CEO: Internal Audit, Public Affairs and Stakeholder, and Registry (confirmed by the owner). Unit names are copied as drawn (for example "Engineering Standard", "Finance and Account").

**Still to come (SRS Section 4):** the Structure page is to cover commissioners and management too. The owner has put this on hold (2026-11-01), so no placeholder people are shown until they ask for it.

## D-065 Public Notices in the Media Center menu, and the registration notice (2026-11-01)

**Decision:** Media Center gets a fifth menu item, **Public Notices**, after News, at `/media-center/notices`. It lists OGSERC's notices newest first, and each notice has its own page at `/media-center/notices/<slug>`. The first is OGSERC's public notice "Commencement of Operations and Mandatory Registration of Electricity Operators" (issued at Abeokuta, 26 October 2026, under Order OGSERC/ORD/2026/001). The homepage's Public notices and Latest updates list it first, and its "View all notices" link now opens the list. The notices sit in `src/lib/notices/public-notices.ts` until build step 9 brings the Announcements collection (FR-NEWS-03); the step 4 seed must carry them over.

**Why a menu item:** the owner first asked for the notice under News. The document is a public notice, the homepage already has a Public notices section with a "View all notices" link, and FR-NEWS-03 makes "public notice" a category of its own. Putting notices under News would mix them with news stories. A Public Notices page that only the homepage links to would be hard to find again. The owner chose the menu item.

**Sitemap change note (SRS 2.5):** SRS Section 4's Media Center lists News, Tenders, Events, Photos & Videos. This adds Public Notices. OGSERC to confirm in writing with the other sitemap items at sign-off (see D-061).

**The text is the notice as issued**, except:
- "license" is spelt "licence", to match the Order and the rest of the site (owner, 2026-11-01). "licensed" and "licensee" are unchanged.
- The semicolon before the bank details is a colon.
- The bank details get a heading, "Payment details", so the page's sections can be navigated.

Every date, deadline, fee, penalty and threshold in the notice was checked against the Order's text on the site, and all match. The notice's "transfer of oversight ... on 23 June 2025" matches the Order's recital 4.

**Bank accounts:** published at the owner's request (2026-11-01), digit for digit as in the notice: Zenith Bank 1313352257 (processing fees) and Sterling Bank 0150934805 (administrative charges), each "50% of Applicable Registration Rate". A test checks both numbers, so a later edit cannot change them by accident. They are shown as one card per account rather than a table, because a five-column table does not fit a 360px phone.

**Dates:** the homepage lists sort by the date the notice went on the site (1 November 2026), as the earlier homepage notices do. The notice's own pages show the issue date, 26 October 2026.

## D-066 Forms page: bank accounts before the rules, contact person hidden (2026-11-02)

**Decision:** At the owner's request, the Forms page shows OGSERC's two bank accounts for registration fees in a **Payment details** box inside the selection guide, after the table and before "Rules for choosing". The accounts come from the registration notice's data (D-065), so the two pages always show the same numbers. A shared `BankAccounts` component draws both. The account name, account number and bank are bold, and the number is large, so they are hard to miss. The box has a gold border and links to the notice, so it reads as separate from the guide's own text (Form REG-GUIDE, which stays word for word as OGSERC's source, D-063).

The "Contact person" line in How to submit is hidden until OGSERC names one: `formsSubmission.contactPerson` is `null`, and setting a name shows the line again.

Tests check that the five values are bold (font weight 700), that the box comes between the table and the rules, and that the rules still match the source.

## D-067 Resources > Downloads lists every file on the site (2026-11-02)

**Decision:** `/resources/downloads` lists every document and form the site offers, to download, grouped by document type. Today that is Forms (REG-01A to REG-01K, Word) and Orders & Directives (Order OGSERC/ORD/2026/001, signed PDF). Each entry shows its reference or form code, file type and size, and its date and status (documents) or version (forms). It links to its own page: the document page, or the form's entry on the Forms page.

**How it stays complete:** the page has no list of its own. `src/lib/downloads.ts` reads the documents catalogue and the registration forms, the same data their pages use, and groups them by the Regulatory Instruments categories in menu order, leaving empty groups out. A new document added to the catalogue appears under its category on both its category page and Downloads, with nothing else to update. In build step 4 both sources move into the Documents collection, and the page reads that instead (FR-CMS-02 lists Downloads as a CMS section).

**Categories** are the Regulatory Instruments menu's (Rules & Regulations, Energy Caps, Guidelines, Forms, …, Orders & Directives), so a document has the same type everywhere on the site. A test compares the page's downloads with every PDF, Word and Excel file under `public/documents` and `public/forms`, so a file published elsewhere but missing here fails the build.

**Accessibility:** each Download button's accessible name names the file ("Download REG-01C (Generation of 10 MW or more), Word, 406 KB"), starting with its visible text, so the twelve buttons are told apart by screen readers and voice control.

## D-068 Media Center > News lists the Latest updates, before the News collection exists (2026-11-02)

**Decision:** `/media-center/news` is live. It lists every item in the homepage's Latest updates (`latestUpdates` in `placeholder-content.ts`), newest first, as cards in a grid: today the registration notice (D-065), the registration forms and Order OGSERC/ORD/2026/001. Each card links to the item's own page. The menu's News item and the homepage's "View all news" link now open it.

**Why:** after the registration notice went live under Public Notices, the owner noticed that News still showed "This section is being prepared". The notice was first meant for News. The Latest updates items are already the site's news (the comment on `latestUpdates` says build step 9 moves them into the News collection), so News shows them rather than repeating them in a second list. The registration notice therefore appears on both News and Public Notices; it has one page, under Public Notices.

**Adding news until step 9:** add an entry to `latestUpdates`. It appears on the homepage and on News. In build step 9 the page reads the News collection instead (FR-NEWS-01: author, category, featured image, attachments), and the branded image placeholder gives way to real photographs.

## D-069 News stories have their own pages, with a photo gallery (2026-11-16)

**Decision:** news stories live in `src/lib/news/news-articles.ts` until build step 9 brings the News collection (FR-NEWS-01). Each story has its own page at `/media-center/news/<slug>`: the title band with the date, the first photograph leading the story, the text (paragraphs and an optional highlighted list), then the other photographs as a gallery. Stories feed the homepage's Latest updates and the News page (D-068), where their card shows the lead photograph instead of the branded placeholder. The first story is "OGSERC Visits NERC to Strengthen Regulatory Collaboration" (13 November 2026), with seven photographs, text as supplied by the owner. Only the title's capitals were changed to title case.

**Photographs:** resized and re-encoded before commit (full size up to 1600px wide, and a 640px thumbnail for cards and the gallery), with their metadata removed. The VPS serves images as they are (`IMAGE_PROCESSING=off`, D-056), so small pages need small files in the repo. There are no captions or names (owner). Each photo has a plain description as alt text that does not guess who is who.

**Gallery:** each thumbnail is a link to the full-size photo, so without JavaScript it simply opens the image. With JavaScript it opens a viewer: a native modal `<dialog>` like the menu drawer (D-036), with previous and next buttons, arrow keys, Escape, a close button, a click outside the photo to close, Tab kept inside, page scroll locked and focus returned to the thumbnail. It fades in with `@starting-style`, and the fade is skipped for reduced motion. Its CSS is in `globals.css` (D-041). The client JavaScript loads only on story pages.

**Adding a story until step 9:** put the photos through the same resize (full and `-thumb`), add them under `src/assets/news/<slug>/`, and add an entry to `newsArticles`. The step 4 seed must carry the stories and their photos into the CMS.

## D-070 Order OGSERC/ORD/2026/002, the transitional adoption of NERC instruments (2026-11-16)

**Decision:** OGSERC's second Order, *Order on the Transitional Adoption of NERC Regulatory Instruments in the Ogun State Electricity Market* (OGSERC/ORD/2026/002), is published at `/regulatory-instruments/orders-and-directives/ogserc-ord-2026-002`, beside Order 001 and in the same way (D-060). It should have gone up with Order 001; the owner supplied the signed copy on 2026-11-16.

**Dates come from the signed copy.** It was made on 2 November 2026 ("Dated at Abeokuta this 2nd day of November 2026", page 9), and paragraph 2 says it takes effect on 3 November 2026. The owner first asked for 26 October and 2 November, to match Order 001. They agreed 3 November once paragraph 2 was pointed out, but still wanted 26 October as the date made. The site shows 2 November because the signed instrument on the same page says so, and the site must not show a regulatory instrument as published before it was signed. If OGSERC issues a corrected signed copy, the dates follow it.

**The files:**
- **Signed copy.** OGSERC's scan (HP Scan, 11 pages at 200 dpi, 3.4 MB, no text layer) is served as supplied. Unlike Order 001 it was small enough not to need a reduced copy.
- **Full text.** No Word file was supplied, so the text was typed from the scan and checked against it page by page. It keeps the Order's own spelling and slips as signed: "license", "regularization", "allow a state set up" (recital B), "Option B:" in paragraph 12(4), paragraph 17(2) ending at item (e) with "; or", and Schedule 1's note that "The Check column is for the legal team and is removed before signature". Schedule headings use Order 001's form ("Schedule 1: Adopted instruments" with "(Section 5)" beneath), so they get `#schedule-1` anchors and a Contents link. If OGSERC supplies the Word file, compare the text against it.
- **No "Questions?" box.** The Order names no address for enquiries.

**Homepage and News (owner, 2026-11-16):** Order 002 is a Latest update (so it is also on News) and a homepage public notice. Both are dated 2 November 2026, the Order's own date, as Order 001's update carries 26 October. The notice is worded as the Order's title, not "is now published", because the date shown is the Order's date, not the day it went online.

## D-071 Consultation: paper OGSERC/CP/2026/001 and the draft State Grid and OGEM Order (2026-11-17)

**Decision:** Regulatory Instruments > Consultation is built (`/regulatory-instruments/consultation`) and lists OGSERC's first consultation: Consultation paper OGSERC/CP/2026/001, *Regularization of Unlicensed Electricity Distribution in the Sagamu Interchange, Ota and Agbara Areas, and Gas Supply for Embedded Generation*, and the draft Order it consults on, *Order on the Establishment of the Ogun State Grid and the Ogun Electricity Market, Gas Supply for Embedded Generation Connected to the State Grid, and the Regularisation of Unlicensed Distribution and Third-Party Investment in Industrial Distribution Zones in Ogun State*. Each has its own page. They sit in `catalogue.ts` like the Orders (D-060), and Downloads picks them up.

**Consultation details (FR-DRAFT-01, FR-DRAFT-02).** Documents can now carry a `consultation` field: closing date, hearing, email, hand-delivery address and subject line. A document with one shows a "Have your say" panel first in its sidebar, and a "Comments by" badge on its card and page. The email link pre-fills the paper's subject line. Comments go by email or by hand only; there is no online form (Phase 2). The badge states the closing date, not "open" or "closed", because the pages are static and a computed state would go out of date.

**Taken from the documents, not supplied separately.** The owner said there was no consultation date, but the paper gives one: issued 16 November 2026, responses by 30 November 2026, hearing in Abeokuta on 3 December 2026 (cover, document control table, "How to respond", Section 13). The site shows those. The owner gave `info@ogserc.org.ng` for comments, which matches the paper.

**Status of the draft.** The draft Order is listed with status Published: in FR-DOC-02 and the CMS, "draft" means not yet public, and drafts are never served (D-060). It shows as a draft through its type ("Draft Order"), its reference, and its own cover wording as the summary: "Not yet made by the Commission; no legal effect."

**Shown as printed.** The draft's cover leaves its numbers blank ("OGSERC/ORD/2026/[●] (draft)", "Consultation Paper OGSERC/CP/2026/[●]"), and the site shows them that way. The owner is content with this. The paper calls it Order No. OGSERC/ORD/2026/003, and the draft's paragraph B.1 names CP/2026/001.

**Files.** Both are Word exports with a text layer (24 and 63 pages, 1.0 and 1.3 MB). No full text is typed into the site this time: site search (step 10) can index the PDFs' text layer. The paper is served as supplied.

**One correction to the draft, at the owner's request.** Article 47.3 (page 50) gave `info@ogserc.gov.ng`; the owner confirmed it should be `info@ogserc.org.ng` and asked for it to be fixed. No Word file was supplied, so the PDF was corrected as a standard incremental update: page 50's content stream is appended with "gov" changed to "org", and a new cross-reference section points back to the original. Every original byte is kept, and nothing else changed. It is not an email link, so no link needed changing. Checked: the text layer reads `info@ogserc.org.ng`, the file still has 63 pages, and page 50 renders cleanly. OGSERC's Word source still has `.gov.ng`, so it should be corrected there before the final Order. The original file is kept in the git-ignored `incoming/` folder.

**Shared pieces.** The Orders listing and document page are now `DocumentCategoryPage` and `DocumentDetail`, used by both categories. Document pages now show related documents (FR-DOC-03), and the paper and the draft link to each other.

**Homepage and News (owner, 2026-11-17):** the consultation is a Latest update (so it is also on News) and a homepage notice in the "Consultation notice" category (FR-NEWS-03). Both link to the paper's page and are dated 16 November 2026, the date of issue. At the owner's request the update card has a graphic instead of the branded placeholder (`src/assets/updates/consultation-cp-2026-001.jpg`, 960×540, 56 KB, no metadata). It combines hero photo 2 under a deep-green overlay, the two documents' cover pages (rendered with pdf.js), the gold bolt, "Public consultation", "Have your say" and the closing date. Like every card image it is decorative (empty alt): the card's title and summary carry the same information.

**Raised with the owner, left as supplied (owner, 2026-11-17):** the paper is version 2026.2 and the draft 2026.1. The paper's recovery terms differ between sections: 42 instalments after a six-month moratorium (summary, Q12 "48 months"), but 60 months with 54 instalments in Section 6. Its compensation look-back reads "[6] years" in Section 6 and "5-year" in Q9. Some bracketed blanks remain ("[60] days", "[60] months"). Section 2 has a slip: "It particularly from five groups". Corrections come from OGSERC as new files.

## D-072 Next.js 16.4.3 to 16.4.6 for GHSA-mfr8-8qww-v76h (2026-11-17)

**Decision:** `next` and `eslint-config-next` go from 16.4.3 to 16.4.6, the latest patch release. 16.4.3 is affected by GHSA-mfr8-8qww-v76h (moderate): information disclosure across root params when a `'use cache'` function is called through `unstable_cache()`. It is fixed in 16.4.5. The site does not use `unstable_cache`, but Next.js 16.4.3 stopped `next dev` and `next build` with a security notice that only a retry got past. That would break CI and deploys, so the upgrade could not wait.

**Checked:** Payload 3.90.2 accepts Next.js `>=16.3.3 <17.0.0`. Lint, typecheck, build (no security notice) and the full Playwright suite against the production build pass. `pnpm audit` no longer lists the advisory. No code changes were needed.

## D-073 A consultation's documents appear together on each of their pages (2026-11-17)

**Decision (owner, 2026-11-17):** the paper and the draft Order work together, so each page now has a "Documents in this consultation" section showing both files, the page's own document first: what each one is, its reference and file details, Open and Download, and a link to the other's page. Before, the homepage card led to the paper's page, where the draft Order showed only in the sidebar's Related documents. The sidebar panel stays (FR-DOC-03). A document belongs to a consultation when it carries the same `consultation` details (`consultationDocuments` in `catalogue.ts`).

**Previews start closed on consultation pages (owner).** Showing two inline PDFs at once would download 2.3 MB before anyone asked. On these pages each preview starts closed and loads its PDF only when "Show preview" is first pressed. Orders keep their preview open, as before (D-060). With two files on a page, the Open, Download and preview buttons name their file for screen readers (for example "Show preview of Draft Order for consultation, version 2026.1"), and each preview has its own id.

## D-074 Legal pages: Privacy Policy and Terms of Service only (2026-11-17)

**Decision:** The footer's legal links are **Privacy Policy** (`/privacy-policy`) and **Terms of Service** (`/terms-of-service`). At the owner's request, the Cookie Notice, Accessibility Statement and Sitemap links are removed. Both pages carry OGSERC's text as the owner supplied it on 2026-11-17, word for word, in `src/lib/legal/legal-pages.ts` until build step 4 moves them into the Pages collection (the seed must carry them over). One `LegalPageView` component draws both: title band, "Last updated", then numbered sections. The contact sections link the address from `contactDetails`, so it stays in step with the footer.

**Cookies:** FR-WEB-06 asks for a cookie notice only if non-essential cookies are used. Today none are: analytics is to be cookie-free (FR-WEB-07) and the Google map loads only when a visitor asks for it (D-058). The owner chose to cover cookies as a section of the Privacy Policy rather than a page of its own. OGSERC's text has no cookies section yet, so section 7 "Cookies" shows "[Sample, OGSERC to supply]" and the supplied "Contact Us" becomes section 8. That placeholder must be replaced before launch.

**Accessibility and Sitemap:** dropping the Accessibility Statement removes a page, not the commitment: the site still meets WCAG 2.1 AA (NFR, every page tested with axe). Dropping the human-readable Sitemap link does not affect `sitemap.xml` for search engines (build step 11).

**For OGSERC's legal advisers to review (not changed on the site):** the text describes features that come in Phase 2 (accounts and login details, complaints, petitions, uploads), and the Privacy Policy does not yet mention the Nigeria Data Protection Act 2023, a retention period, or the other NDPA rights (access, deletion, objection, complaint to the NDPC), which NFR-SEC-19 and the SRS's privacy requirements expect to be confirmed with them.

**SRS change note (SRS 2.5):** FR-WEB-06 and SRS Section 4's footer list Privacy Policy, Terms of Service, Cookie Notice, Accessibility Statement and Sitemap. This keeps the first two. OGSERC to confirm in writing with the other sitemap items at sign-off (see D-061).

## D-075 Main menu: User Profile removed, Consumer Complaint last (2026-11-17)

**Decision (owner):** the main menu has six items: About OGSERC, Regulatory Instruments, Mandate, Media Center, Resources, Consumer Complaint. **User Profile** is removed, because it and Consumer Complaint lead to the same consumer complaint portal; Consumer Complaint stays and moves to the end. Its link still goes to "This section is being prepared" until the Consumer Complaint page is built.

**Scope:** online complaint submission, tracking and user accounts are Phase 2 (SRS Section 5). In Phase 1 the Consumer Complaint page gives information only (how to complain, what to include, contacts), per CLAUDE.md. The portal is to be planned with the owner before any Phase 2 work starts.

**Layout:** with six items the menu bar has more room at 1024px; the overflow and wide-fallback-font tests (D-032) still run against it.

**Sitemap change note (SRS 2.5):** SRS Section 4 lists seven main-menu items, with Consumer Complaint fourth and User Profile seventh. OGSERC to confirm in writing with the other sitemap items at sign-off (see D-061).

## D-076 Audit: GHSA-fc5q-39xc-vjpf (picomatch) ignored until a fix exists (2026-11-17)

**Decision:** advisory **GHSA-fc5q-39xc-vjpf** (`picomatch` <=4.0.7, high: a crafted glob pattern with repeated extglobs can make matching very slow, ReDoS) is added to `pnpm.auditConfig.ignoreGhsas` in `package.json`, as GHSA-vfj7-8cjw-p6xm (`braces`) was at scaffold time. Published on 2026-11-17, it turned the CI audit red on every branch, `main` included.

**Why ignoring is safe for now:** no patched version exists (`patched: <0.0.0`), so no update or override can fix it. `picomatch` is reached through ESLint (`eslint-config-next`), `sass`'s file watcher (`chokidar`) and Payload's type generator (`json-schema-to-typescript`). All of these match glob patterns written in our config and code. No visitor input, form field or URL ever becomes a glob pattern, so the website cannot be slowed down this way.

**Remove the ignore** as soon as a fixed `picomatch` is released, and update the packages that bring it in (or add a pnpm override).

## D-077 Visitor statistics: Umami, self-hosted on OGSERC's server (2026-11-18)

**Decision (owner, 2026-11-18):** the site counts visits with **Umami 3.5.0**, run as a fourth container in `docker-compose.prod.yml` on OGSERC's VPS (FR-WEB-07). This brings forward part of build step 11.

**Why Umami, and why on OGSERC's server:**
- **Privacy:** it sets no cookies and builds no visitor profiles, so no cookie banner is needed (D-074).
- **Data location:** the data stays on OGSERC's own server rather than with a foreign provider, which keeps the Nigeria Data Protection Act position simple.
- **Cost:** it is free and open source.
- **Portability:** it needs only PostgreSQL, which the server already runs.
- **Alternatives:** Plausible or Umami's hosted service would need no upkeep, but they hold the data abroad and cost money.

**What it records:**
- pages viewed;
- the referring site;
- browser, operating system, device type, and country (from the IP address);
- words typed into site search, which the owner chose to keep, because they show what people look for.

It does not record names, accounts or form contents, and staff pages are never tracked: the script is only in the public layout. Browsers that send Do Not Track are not counted at all (`data-do-not-track`).

**How it is wired:**
- **No outside domain:** Caddy serves the tracker at `/pulse/p.js` and the endpoint it reports to at `/pulse/e` on the site's own address. Pages therefore load nothing from another domain, and the strict CSP (step 12) needs only `'self'` for it. The neutral names also mean fewer visits go uncounted because of ad blockers.
- **Prefix stripped by Caddy (fixed 2026-11-18):** the tracker sends visits to the folder its script came from plus the collect endpoint. With `TRACKER_SCRIPT_NAME=pulse/p.js` and `COLLECT_API_ENDPOINT=/pulse/e`, browsers posted to `/pulse/pulse/e` and got 404, so nothing was counted. A direct curl to `/pulse/e` had worked, which hid the fault. Umami now serves `p.js` and `/e`, and Caddy removes `/pulse` (`uri strip_prefix`).
- **Size and loading:** the script is about 2 KB and loaded with `defer`, so it never delays the page.
- **When it is on:** `UMAMI_WEBSITE_ID` switches it on. Static pages are rendered during `next build`, so it is also a Docker build argument, like `IMAGE_PROCESSING`. It is not a secret.
- **Off everywhere else:** without the setting there is no script tag, so development and previews are never counted. CI uses a made-up ID to test the tag.

**Database:** Umami has its own database and its own non-superuser role (`umami`) in the existing PostgreSQL container, created by `deploy/create-analytics-db.sh`. `CONNECT` is revoked from `PUBLIC` on both databases, so Umami cannot reach the site's data. `deploy/backup-db.sh` dumps it nightly alongside the site's database.

**Dashboard:** at `stats.<domain>`. Every user has their own account with two-factor sign-in turned on (Umami 3.3+, `TWO_FACTOR_ENCRYPTION_KEY`).
- **No shared password in front:** an extra Caddy password was considered and dropped. It would be one login shared by everyone, which CLAUDE.md does not allow.
- **Default account:** Umami's default `admin` account must have its password changed at first sign-in (Umami 3.5 enforces this). It is then renamed or replaced by named accounts.
- **Read-only access:** managers who only need to read can be sent a share link instead of an account.

**Upgrades:** Dependabot watches only the `Dockerfile`, not compose images, so the pinned Umami version is reviewed with the other planned upgrades (RUNBOOK Section 10). Umami's own update notice on the dashboard is left on. Security releases (for example 3.4.1) are applied promptly.

**Privacy Policy:** section 7 first read "[Sample, OGSERC to supply: cookies and visitor statistics]". On 2026-11-18 the owner asked for wording, because the site is already public. It is now "7. Cookies and Visitor Statistics", drafted from what the site actually does and approved by the owner in a deliberately short form:
- no tracking or advertising cookies;
- statistics on OGSERC's own server, recording general information (pages, referring site, device and browser, approximate location, site searches);
- no cookies, no stored IP address, no identification;
- Do Not Track honoured;
- not shared or sold;
- kept for two years;
- the Google map's cookies, only when a visitor loads it (D-058).

Before publishing, two claims were checked on the server:
- **No stored IP address:** no Umami table has an IP column. The only columns matching `%ip%` were the `description` fields of `board` and `report`.
- **Search words recorded:** Umami keeps the page address, which includes `?q=`.

OGSERC's legal advisers should review it with the rest of the policy (D-074).

**Two-year retention:** the owner chose two years. That is long enough to compare one year with the next and short enough to meet the storage-limitation principle. Umami has no retention setting when self-hosted, so `deploy/prune-analytics.sh` deletes visitor data older than two years once a month.
- **What it deletes:** `website_event`, `event_data`, `session_data`, `revenue`, `error_event`, `heatmap_event` and `session_replay`, then each `session` with no page views left.
- **What it keeps:** accounts, websites, reports, boards, share links and replays staff saved.
- **How it is written:** a fixed list of table names, so the SQL never contains outside input. It skips with a warning, rather than failing, if a Umami upgrade renames a table, and `--dry-run` reports and rolls back.
- **Backups:** dumps live for 14 days, so deleted rows leave the backups two weeks later.

**To check on the server:** the VPS's virtual CPU lacks SSE4.1 and SSE4.2 (D-056). If Umami's container fails for the same reason, statistics stay off and the site is unaffected: the app does not depend on it, and Caddy does not wait for it.

## D-078 Search engines may list the site (2026-11-18)

**Decision (owner, 2026-11-18):** OGSERC is happy for the site to be found. The preview's `X-Robots-Tag: noindex, nofollow` is removed from `deploy/Caddyfile`, and the site gains what search engines and link previews need. This brings part of build step 11 forward.

**Checked before the switch:**
- **No placeholder text is public:** none of the 14 public pages showed "OGSERC to supply" or "[Sample …]" on 2026-11-18.
- **Unfinished menu items stay out of results:** they lead to `/being-prepared`, which carries its own `noindex`, as does the design-review page.
- **Unchanged:** the closure of `/admin` and `/api` at Caddy (until Step 3) and the one-day HSTS. Neither affects search.

**What is added:**
- **`robots.txt`** (`src/app/robots.ts`): everything public may be crawled, `/admin` and `/api` are excluded, and it names the sitemap.
- **`sitemap.xml`** (`src/app/sitemap.ts`):
  - **Sources:** the menu's ready pages, the two legal pages, and every news item, public notice, order and consultation document.
  - **Dates:** each content item carries its own date as `lastmod`.
  - **Maintenance:** it is built from the same lists as the pages, so new content appears without editing it.
  - **Not used:** `changefreq` and `priority`, which Google ignores.
- **Canonical links:** `alternates.canonical: './'` in the public layout resolves to each page's own path without its query string. Filtered listings, `www.` and other variants therefore all point to one official address.
- **Link previews** for WhatsApp, Facebook and X: Open Graph and Twitter card tags take each page's existing title and description. The image is `opengraph-image.png`, generated once from `public/brand/ogserc-logo.png`: the logo, trimmed and centred on white, at 1200×630. Every page already had its own title and description, so no new public wording was written.

**Site address at build time:** canonical links, previews, `robots.txt` and `sitemap.xml` are built in advance, so `SITE_URL` is now also a Docker build argument. `src/lib/site-url.ts` reads it and **stops a production build if it is missing**, rather than tell search engines the site lives on `localhost`. The compose files and CI pass it.

**After deploying:** verify the domain in Google Search Console with a DNS `TXT` record, submit the sitemap, and import the site into Bing Webmaster Tools (RUNBOOK Section 8). Bing's index also serves DuckDuckGo and Yahoo.

## D-079 Server log report (GoAccess), and disk and backup alerts (Healthchecks.io) (2026-11-18)

**Decision (owner, 2026-11-18):** three additions to the VPS's monitoring, beside Umami (D-077) and UptimeRobot.

**1. Visit log.** Caddy now writes one JSON line per request on the main site to the `caddy_logs` volume.
- **Rotation:** `roll_at 00:00` starts a new compressed file each night, and `roll_keep_for 336h` deletes files after 14 days. `roll_size` is only a safety cap.
- **IP addresses:** the owner chose full addresses for 14 days. They are needed to see and block attacking addresses. Masking was the alternative. Privacy Policy section 2 already lists IP addresses among the technical information collected, and the statement in section 7 that no IP address is stored refers to the visitor statistics tool, which is true.
- **Not logged:** the `stats` subdomain.

**2. GoAccess report** (`deploy/log-report.sh`, nightly at 02:40).
- **What it shows:** what Umami cannot see, because Umami counts only browsers that run its script:
  - PDF and other file downloads;
  - crawlers, including Googlebot;
  - 404s and other errors;
  - probes and attack attempts;
  - bandwidth.
- **How it runs:** GoAccess 1.12 runs from its pinned Docker image (`allinurl/goaccess:1.12`), with nothing installed on the server. The logs belong to root inside the Caddy container, so they are read there and piped to GoAccess, which runs as the deploy user.
- **Where the report lives:** `/var/backups/ogserc/reports/report.html` (folder 700, file 600), replaced every night.
- **How it is viewed:** the owner chose to download it with `scp` (RUNBOOK Section 8) rather than publish it, because the report contains IP addresses. A page on `stats.<domain>` would have needed a shared password, which CLAUDE.md does not allow. Downloaded copies should be deleted after viewing, to keep within the 14 days.

**3. Disk and backup alerts through Healthchecks.io's free plan.** The server cannot send email (that arrives with the contact form, step 5), and UptimeRobot's heartbeat monitors are not on its free plan.
- **Disk:** `deploy/check-disk.sh` runs every 30 minutes. It pings with the usage of `/`, Docker's data and the backup folder, and sends `/fail` at **80%** or more.
- **Backup:** `deploy/backup-db.sh` pings when the nightly backup succeeds and sends `/fail` when it fails. Without `HC_BACKUP_PING_URL` it runs as before.
- **Missed pings:** Healthchecks.io also alerts when pings stop arriving, so a dead server or a broken cron job is noticed too, which a status page watched by UptimeRobot could not do.
- **The ping URLs:** they are kept in the server's `.env` and treated as secrets.
- **What leaves the server:** only the ping and the disk percentages. No visitor data is sent.

## D-080 Off-server backups: restic to Backblaze B2, encrypted (2026-11-18)

**Decision (owner, 2026-11-18):** each nightly backup is also copied off the VPS, encrypted, to **Backblaze B2** (EU Central). Copies are kept as **7 daily, 4 weekly and 3 monthly**. This closes RUNBOOK Section 6's open item: until now the dumps lived only on the same server, so losing the server meant losing them.

**How:**
- **The tool:** `deploy/offsite-backup.sh` runs **restic 0.19.1** from its pinned Docker image (`restic/restic:0.19.1`), so nothing is installed on the server. restic encrypts on the server before upload (NFR-SEC-16), uploads only changes, and applies the retention policy with `forget --prune`.
- **What is copied:**
  - the latest site and statistics dumps;
  - the server's `.env`, because a restored database is unusable without `PAYLOAD_SECRET` and the other secrets.

  They are staged under fixed names, so every copy covers the same paths and retention can group them. The host name is fixed (`ogserc-vps`) for the same reason.
- **When:** `deploy/backup-db.sh` runs it after the nightly dumps once `OFFSITE_REPOSITORY` is in `.env`. A failure fails the Healthchecks.io backup check (D-079), so the owner is alerted.
- **Secrets:**
  - they live in the server's `.env` as `OFFSITE_*`;
  - they are passed to Docker by name (`-e NAME`), never as values on a command line;
  - the B2 key is restricted to the one bucket.
- **Provider-neutral:** it uses B2's S3-compatible endpoint, so any S3-compatible store works by changing `OFFSITE_REPOSITORY` and the key (CLAUDE.md, Portability). The region is taken from the endpoint name where present.
- **Restore test:** `deploy/test-restore.sh` restores the latest copy into a throwaway PostgreSQL container with no published port. It checks that the site's tables and migrations are there, and counts statistics page views. It then removes everything. RUNBOOK Section 6 also gives the steps after losing the server.

**Why B2:** the copies are a few megabytes, well inside B2's free 10 GB, and B2 needs no payment card to start. It can also hold the CMS's uploaded files in Step 4, so one provider serves both. Cloudflare R2 was the alternative. Storage in Nigeria was considered and can replace B2 later without code changes.

**Retention and the Privacy Policy:** with at most 3 months off the server and 14 days on it, data deleted under the two-year statistics promise (D-077) leaves every backup within 3 months.

**Cross-border storage:** the copies are held in the EU but are encrypted before they leave the server with a key that only OGSERC holds, so the provider cannot read them. OGSERC's legal advisers may want to note this for the NDPA (D-074).

**Risks the owner should know:**
- **Losing the password:** if `OFFSITE_PASSWORD` is lost, the copies cannot be opened by anyone. It is kept in the password manager, separately from the server.
- **Attackers on the server:** someone who takes over the server could use the bucket key to delete the copies. B2 Object Lock (write-once retention) would prevent that, and can be added later if wanted.

## D-081 Rate limits on staff sign-in, forgotten passwords and reset links (2026-11-20)

**Decision:** Fixed-window limits, checked in `beforeOperation` on the Users collection before any other work (`src/lib/auth/rate-limit.ts`):

| Action | Per address | Per email |
|---|---|---|
| Sign in | 10 attempts in 15 minutes | 10 **failed** attempts in 15 minutes (counted in `afterError` on a 401) |
| Forgotten password | 5 per hour | 3 per hour |
| Reset link | 10 per hour | none (the token is the secret) |

Above a limit the reply is a 429 with `Retry-After` and one fixed message ("Too many attempts. Try again in N minutes."), the same whether or not the account exists. Counts live in a hidden `rate_limits` table (`src/collections/RateLimits.ts`, migration `20261120_054654_rate_limits`, deny-all access) and are written with parameterised SQL on the connection pool, outside the request's transaction. Only REST requests are limited; trusted server code (the Local API) is not. The visitor's address is the last entry of the header named in `CLIENT_IP_HEADER`, which production requires.

**Why:**
- **Outside the transaction:** a refused sign-in rolls its transaction back, which would undo a count made inside it, so failures would never add up.
- **Failed sign-ins only, per email:** a correct password never uses up the allowance, so staff are not slowed by someone else's guesses from elsewhere. Every attempt counts per address.
- **10 per email, above the lockout's 5:** Payload's lockout still protects real accounts at 5 and keeps its single reply (D-052). The email limit adds a limit for addresses that do not exist (which never lock), so after 10 tries known and unknown addresses get the same 429.
- **The same 429 for known and unknown accounts** on every action, so a limit never shows that an account exists.
- **HMAC keys:** the table never holds an address or email in readable form; `PAYLOAD_SECRET` keys the HMAC, so keys change if the secret is rotated, which simply resets the counts.
- **The last entry of `X-Forwarded-For`:** behind Caddy every request comes from Caddy, so the socket address is useless. Caddy sets the header itself and does not trust a value sent by the visitor; even where a proxy appends, the last entry is the one our own proxy added, and anything earlier can be made up. An unparseable value falls into one shared "unknown" bucket rather than being trusted.
- **Production refuses to start without `CLIENT_IP_HEADER`:** without it every visitor would share one address limit, and one person could block sign-in for everyone. `docker-compose.prod.yml` sets it to `X-Forwarded-For`; another host sets the header its own proxy uses.
- **Postgres, not memory:** counts survive a restart and would be shared by several app instances. The table stays small: about one request in 20 deletes ended windows.
- **No new library and no outside service.**
- **The 429's body is written by an `afterError` hook (`rateLimitReply`), decided by status:** in the production build Payload's formatter does not recognise the thrown error (class names are minified, D-051) and answered "An unknown error occurred." CI caught this; the status and `Retry-After` were already right.

**Not covered (planned elsewhere):** limits on the rest of the admin area and API, and bot protection, come with Turnstile (Step 5) and the firewall/CDN layer (Step 13). The two-factor code check gets its own limit with 2FA (Step 3 plan commit 6). Someone who knows a staff email can still trigger that account's 15-minute lockout (D-052).

**Watch (re-check after Payload upgrades):** `beforeOperation` running before the password check for `login`, `forgotPassword` and `resetPassword`; `afterError` receiving the 401 with `req.data` parsed; the error route adding `req.responseHeaders` to its reply (Payload 3.90.2, `utilities/routeError.js`); `forgotPassword` answering 200 whether or not the account exists.

## D-083 Audit log of sign-ins, account changes and images (2026-11-20)

(D-082 is reserved for the image-processing "option A" decision of 2026-11-18, still to be written.)

**Decision:** An `audit-log` collection (`src/collections/AuditLog.ts`), written only by server hooks (`src/lib/audit/`), records:

| Event | Where it is caught |
|---|---|
| Sign-in succeeded | `afterLogin`, only for the login endpoint (a reset link also signs in, but is recorded as a reset) |
| Sign-in failed (wrong password, account locked, unknown account), limited (429), account locked | `afterError` on the login endpoint; the lock state is read before the attempt (`noteLockBeforeLogin`) so "this attempt locked it" is told from "it was already locked" |
| Signed out | `afterLogout` |
| Password reset requested / completed | `afterForgotPassword` (Payload runs it only for an email that has an account) / `afterOperation` for `resetPassword` |
| Password changed (own, or set by another account) | `beforeValidate` notes that the update carries a password (`notePasswordChange`), because Payload hashes it and removes it from the data before `afterChange`, which then records it |
| Account created / updated (field names) / roles changed (old and new) / deleted | `afterChange`, `afterDelete` |
| Account unlocked (admin panel or API, or server code such as `pnpm auth:unlock`) | `afterOperation` for `unlock` |
| Image uploaded / changed (field names) / deleted | `afterChange`, `afterDelete` on Media (`contentAuditHooks`, which Step 4's collections will reuse) |

Each entry holds the time, the actor (a link to the account and a copy of its email), the target (type, id, and the email or file name at the time), the internet address and browser, and `details` built from an allow-list: changed field names, old and new roles, a reason, and how it was done. Administrators can read it, with filters; nobody, administrators included, can create, change or delete an entry through the admin panel or API.

**Retention (owner's choice, 2026-11-20):** `deploy/prune-audit.sh`, run monthly by cron, blanks the address and browser after 90 days and deletes entries after 2 years. Both are `.env` settings (`AUDIT_IP_RETENTION_DAYS`, `AUDIT_RETENTION_DAYS`), so OGSERC can change them without a code change (NFR-SEC-19). The statements are in `deploy/prune-audit.sql`, which the database test runs against the test database too. Dumps are kept 14 days on the server and up to 3 months off it (D-080), so removed data leaves every backup within 3 months.

**Why:**
- **In the request's transaction for successful changes:** a change is never saved without its entry, nor an entry without its change; if the entry cannot be written, the change fails.
- **On its own for refused sign-ins:** their transaction is rolled back, which would remove the entry; a failure to write it is logged with fixed text and does not change the reply.
- **What is never stored:** passwords, hashes, salts, tokens, reset links, sessions, file contents, and the email typed for an unknown account (people sometimes type a password there). Every value passes through `auditData`, which only builds known fields, caps text at 320 characters and drops any `details` key not on the list, so a later mistake in a hook cannot write a secret. Saves that change none of the listed fields (Payload storing a reset token or a session) leave no entry.
- **Address and browser** come from `CLIENT_IP_HEADER` (D-081) and the `User-Agent` header. They are personal data, hence the 90-day blanking.
- **Copies of the email and file name:** an entry still reads correctly after the account or image is deleted (the account link is set to empty on delete).
- **Unknown emails at "forgot password"** leave no entry, because Payload stops before its hook; repeated requests are still rate limited (D-081).

**Not covered yet:** two-factor events (Step 3 plan commit 6, which adds them to the action list with a migration); content changes on Step 4's collections; a staff privacy notice about this log, which is OGSERC's to write (the public Privacy Policy covers visitors, not staff).

**Watch (re-check after Payload upgrades):** `afterLogin` also running for `resetPassword`; `afterForgotPassword` running only for known accounts and receiving `args.req`; `afterOperation` for `resetPassword` and `unlock` running after the commit; `forgotPassword` saving the account through `payload.update` (so `afterChange` sees it); failed sign-ins incrementing `loginAttempts` outside any transaction (Payload 3.90.2, `auth/operations/login.js`); the plain password being gone from `data` by `afterChange` (CI caught this: the first version looked for it there and recorded nothing).

## D-084 Two-factor sign-in for staff with payload-totp, guarded (2026-11-20)

**Decision:** Staff sign in with their password and then a 6-digit code from an authenticator app (NFR-SEC-01), using `payload-totp@3.0.7` (MIT, pinned exactly; the plugin and an administrator reset without recovery codes were chosen in the Step 3 plan) with `forceSetup: true` on `users`. Codes are SHA-1, 6 digits, 30 seconds, issuer "OGSERC", which every common authenticator app supports. A staff session that has not entered this session's code gets **no access** to any collection, through the admin panel or the API; an account that has never set it up can only read its own account, to set it up. The plugin is registered in `src/lib/auth/two-factor.ts` and runs last (`order` = `Number.MAX_SAFE_INTEGER`, with `denyByDefault` one below), so it wraps every rule that `denyByDefault` leaves.

Its three endpoints (`/api/setup-totp`, `/api/verify-totp`, `/api/remove-totp`) are wrapped (`guardTotpEndpoint`) with what the plugin lacks:

| Gap in the plugin | Guard |
|---|---|
| A code can be used again within its window (about 90 seconds) | A code accepted for an account is refused for 90 seconds (the `rate_limits` table, marked before the plugin checks it, so two requests with one code cannot both pass) |
| Set-up accepts any secret the browser sends | Secrets under 160 bits are refused (the plugin's own screen generates 256) |
| No limit per address | 10 code checks per address per 15 minutes (D-081), on top of the plugin's own lock after 5 wrong codes (3.0.6) |
| No audit entries | `2fa.enrolled`, `2fa.verified`, `2fa.failed` (wrong code, code already used, too many attempts, set-up key too short), `2fa.removed` (D-083); `2fa.reset` is for the administrator reset |

`guardTotpEndpoints` fails the build if the plugin no longer has exactly those three endpoints, so an upgrade cannot quietly drop a guard.

**Public reads:** the plugin's wrapper refuses visitors who are not signed in. Media keeps public reads with `PUBLIC_READ` (`custom.totp.disableAccessWrapper.read`). A read that differs between the public and staff (`publishedOnly`, from Step 4) uses `publicOrTwoFactor`: visitors get the public rule, signed-in users go through the 2FA check. `users.admin` (may this user open the admin panel) is not wrapped and must not be: a session that owes a code has to reach the panel to enter it, and the plugin's screens send it to the code page.

**`src/proxy.ts`:** the plugin's admin screens need the current path, which a server component cannot read; the proxy passes it as a request header (overwriting any value the browser sends), for `/admin` only, so public pages never run it.

**Why this plugin:** it covers the admin screens (QR code, set-up, verify), the API and the Local API, keeps access rules in one place, and its four published advisories (brute force, another collection overwriting a secret, an open redirect, set-up enforced only in the admin panel) were fixed in 3.0.5 and 3.0.6. Writing our own would mean writing and maintaining those screens and the session handling. It adds `otpauth`, `qrcode` and `jsonwebtoken`; `pnpm audit` is unchanged.

**Accepted limits (owner informed 2026-11-20):**
- **The secret is stored unencrypted** in `users.totp_secret`. The database is not reachable from the internet, the API never returns it (tested), and the off-server copies are encrypted (D-080).
- **The "code entered" cookie is not tied to one sign-in.** It is signed with `PAYLOAD_SECRET`, names only the account, expires with the 1-hour session and is deleted at sign-out. Misusing it needs the cookie and the password.
- **No recovery codes** (Step 3 plan): a lost phone needs an administrator reset, or, for the last administrator, the emergency command (Step 3 plan commit 6, part B). Keep at least two administrators.

**Tests:** every database test signs in through `tests/e2e-db/support/auth.ts`, which now sets up and enters codes (RFC 6238 with `node:crypto`, no extra library). `tests/unit/config-access.spec.ts` audits the rules as written with 2FA off (`portalConfig({ twoFactorSignIn: false })`, which only tests use) and, by behaviour, that on the live config a session owing a code gets only public reads and the admin shell. The drafts scenario builds its config with 2FA off, because its in-process REST requests have no Next.js request for the plugin to read its cookie from; the last-administrator probe marks its administrator as verified (`_strategy: 'totp'`).

**Watch (re-check after every payload-totp or Payload upgrade):** the three endpoint paths and their `{ ok, message }` reply; `verify-totp` validating with `window: 1`; the strategy reading its cookie through `next/headers`; the access wrapper's checks on `_strategy` and `hasTotp`; Payload catching a strategy's error and trying the next strategy; new advisories at https://github.com/GeorgeHulpoi/payload-totp/security.

