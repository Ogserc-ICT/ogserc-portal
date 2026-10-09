# OGSERC portal

Website and regulatory information portal for the Ogun State Electricity Regulatory Commission (OGSERC).

- Requirements: [`docs/SRS.md`](docs/SRS.md)
- Technical decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Deployment and operations: [`docs/RUNBOOK.md`](docs/RUNBOOK.md)
- Working rules for this repository: [`CLAUDE.md`](CLAUDE.md)

> **Before anything is deployed: create the first admin account yourself.**
> On a new, empty database, the `/admin` page lets *whoever arrives first* create the administrator account. For every new database (staging and production), open `/admin` and create the first admin account yourself **before the site is reachable by anyone else**: before DNS points at it and before the address is shared. See [RUNBOOK §4](docs/RUNBOOK.md#4-first-admin-account).

## What it is built with

| Part | Role |
|---|---|
| [Next.js](https://nextjs.org) (TypeScript) | Builds the public pages and runs the server |
| [Payload CMS](https://payloadcms.com) | Admin panel at `/admin` where OGSERC staff manage content; runs inside the Next.js app |
| PostgreSQL | Database (hosted, e.g. Neon or Supabase) |
| [Tailwind CSS](https://tailwindcss.com) | Styling and design system |
| [Playwright](https://playwright.dev) + axe | Browser tests and accessibility checks |

## Getting started

Requirements: Node.js 22 (see `.nvmrc`) and pnpm 10. Docker is optional (only for the portability check).

1. Install dependencies and the git hook that blocks direct pushes to `main`:
   ```sh
   pnpm install
   pnpm hooks:install
   ```
2. Create `.env` from the template and fill it in:
   ```sh
   cp .env.example .env
   ```
   - `DATABASE_URL`: the connection string of your **hosted development database** (for example a Neon dev branch). Do not use the production database.
   - `PAYLOAD_SECRET`: a long random string. Generate one with:
     ```sh
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```
3. Create the database tables:
   ```sh
   pnpm migrate
   ```
4. Start the site:
   ```sh
   pnpm dev
   ```
   - Public site: http://localhost:3000
   - Admin panel: http://localhost:3000/admin. On first visit it asks you to create the first admin account.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Check code with ESLint |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm test:e2e` | Run Playwright browser and accessibility tests (starts the dev server if one isn't running) |
| `pnpm format` | Format code with Prettier |
| `pnpm migrate` | Apply pending database migrations |
| `pnpm migrate:create <name>` | Create a migration after changing collections |
| `pnpm migrate:status` | Show which migrations have run |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` after changing collections |
| `pnpm generate:importmap` | Regenerate the admin panel's component import map |
| `pnpm hooks:install` | Use the repository's git hooks (blocks direct pushes to `main`); run once per clone |

The first time you run tests, install the browser: `pnpm exec playwright install chromium`.

## Contributing

Never push directly to `main`: work on a branch and open a pull request. CI runs lint, typecheck, a dependency audit, the production build, Playwright + axe tests, a secret scan, and a Docker build. **GitHub does not block merging when checks fail on this plan, so wait until every check is green before you merge.** See [RUNBOOK §2](docs/RUNBOOK.md#2-protecting-main-and-scanning-for-secrets). Fill in the pull request template, including the security checklist when a change touches auth, uploads, forms, or access control.

## Project structure

```
src/app/(frontend)/   public pages
src/app/(payload)/    Payload admin panel and API routes (mostly generated)
src/collections/      Payload collections (content types)
src/migrations/       database migrations (committed)
tests/e2e/            Playwright tests
docs/                 SRS, decisions, runbook, reference screenshots
```
