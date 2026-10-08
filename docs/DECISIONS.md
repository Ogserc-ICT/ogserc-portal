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
