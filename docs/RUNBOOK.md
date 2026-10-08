# OGSERC portal runbook

How to set up, deploy, migrate, and move the portal. Keep this current whenever setup, deployment, or operations change.

> Status: build step 1 (scaffold). Sections marked *(to be completed)* are filled in as the matching build step lands.

---

## 1. Environment variables

Every setting comes from environment variables. The full list, with explanations, is in [`.env.example`](../.env.example). In production, set them in the host's secret store; never in files committed to the repository.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use `sslmode=verify-full` for hosted databases. |
| `PAYLOAD_SECRET` | Yes | Long random string that signs login sessions. Different in every environment. Changing it logs everyone out. |
| `SITE_URL` | Yes | Public address of the site, e.g. `https://example.gov.ng`, without a trailing slash. |
| `S3_*` | From step 4 | S3-compatible file storage for uploads. |
| `SMTP_*`, `EMAIL_FROM`, `CONTACT_FORM_TO` | From step 5 | Email for the contact form. |
| `TURNSTILE_*` | From step 5 | Bot protection on forms. |

## 2. GitHub repository settings (one-time, done by hand)

These cannot be set from code. Do them once in GitHub, and again when the repository moves to OGSERC's organisation (NFR-OPS-01).

1. **Protect `main`.** Settings → Rules → Rulesets → New branch ruleset.
   - Target: the default branch.
   - Turn on: *Restrict deletions*, *Require a pull request before merging* (1 approval), *Require status checks to pass*, *Block force pushes*.
   - Under status checks, add: `Lint, typecheck, audit`, `Build and end-to-end tests (Playwright + axe)`, and `Docker image builds`. They appear in the list after CI has run once.
2. **Secret scanning.** Settings → Code security → turn on *Secret scanning* and *Push protection* (NFR-SEC-10).
3. **Dependabot.** On the same page, turn on *Dependabot alerts* and *Dependabot security updates*. Version updates are already configured in `.github/dependabot.yml`.
4. **Account security.** Require two-factor authentication for everyone with access to the repository.

## 3. Database migrations

The database structure only changes through migration files in `src/migrations/` (see D-008 in `docs/DECISIONS.md`).

**After changing a collection or field (development):**

```sh
pnpm migrate:create describe-the-change   # writes a new file in src/migrations/
pnpm migrate                              # applies it to your dev database
```

Review the generated file, then commit it with the code change.

**Check what has run:** `pnpm migrate:status`

**In production:** pending migrations run automatically when the server starts. To run them by hand instead (for example before switching traffic), set the production environment variables and run `pnpm migrate`.

**Before any production migration:** take a database backup (Section 6).

## 4. First admin account

On a brand-new, empty database, `/admin` shows a "create first user" screen that **anyone who reaches the site can use**. On every new database (staging or production), create the first administrator account yourself **before the site is reachable by anyone else**. Do this before pointing DNS at it or sharing the address.

## 5. Deploying *(to be completed in step 13)*

### Vercel

*(to be completed: project settings, environment variables, spend limits, NFR-HOST-03)*

### Any Docker host (VPS, Railway, Render, Fly.io, ...)

```sh
docker build -t ogserc-portal .
docker run --env-file .env -p 3000:3000 ogserc-portal
```

The container listens on port 3000. Put it behind HTTPS (the host's load balancer, or a reverse proxy such as Caddy or nginx). Migrations run on startup.

**Local portability check** (production image plus a throwaway local Postgres; requires Docker):

```sh
PAYLOAD_SECRET=any-long-random-string docker compose up --build
```

## 6. Backups and restore *(to be completed in step 13)*

## 7. Moving to another host

1. **Deploy the code** to the new host (Docker image or Node.js build).
2. **Set environment variables** there (Section 1). Use a new `PAYLOAD_SECRET` only if you accept that everyone will be logged out.
3. **Restore the database dump:**
   ```sh
   pg_dump --format=custom --no-owner --no-acl "$OLD_DATABASE_URL" > ogserc.dump
   pg_restore --no-owner --no-acl --dbname "$NEW_DATABASE_URL" ogserc.dump
   ```
4. **Copy storage files** from the old S3-compatible bucket to the new one *(commands added in step 4)*.
5. **Update DNS** to point at the new host, and confirm HTTPS works.
6. Run `pnpm migrate:status` against the new database to confirm it is up to date.

## 8. Monitoring and incident response *(to be completed in step 13)*
