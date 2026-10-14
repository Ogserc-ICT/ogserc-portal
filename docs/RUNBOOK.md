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

## 2. Protecting `main` and scanning for secrets

The repository is private and on GitHub's free personal plan. On that plan, **GitHub does not enforce branch protection and does not offer secret scanning for private repositories.** NFR-OPS-01 and NFR-SEC-10 allow for this. Until the plan changes, `main` is protected by the rule, the hook, the Claude Code settings and the CI checks below, and secrets are caught by a scanner in CI (D-019 in `docs/DECISIONS.md`).

### 2.1 The rule

**Nothing is pushed directly to `main`.** Every change goes on a branch, then through a pull request, and is merged only when every CI check is green.

> **GitHub will not stop you.** On this plan, the *Merge pull request* button works even when checks are failing or still running. **You must wait until every check shows a green tick before merging.** A red or yellow check means do not merge.

The checks that must all be green on every pull request:

- `Lint, typecheck, audit`
- `Build and end-to-end tests (Playwright + axe)`
- `Secret scan (gitleaks)`
- `Docker image builds`

### 2.2 Local pre-push hook (install once per clone)

A git hook in `scripts/git-hooks/pre-push` refuses any push whose destination is `main` (including `git push origin HEAD:main` and deleting `main`), and explains what to do instead. Install it once in every clone:

```sh
pnpm hooks:install
```

This runs `git config core.hooksPath scripts/git-hooks`, telling git to use the hooks committed in the repository. Check it with `git config core.hooksPath`, which should print `scripts/git-hooks`.

- **It is a safety net, not a lock.** It only runs on machines where it is installed, and anyone can skip it on purpose with `git push --no-verify`. Use that only in an emergency, and record why in the pull request or `docs/DECISIONS.md`.
- It does not affect merging a pull request on GitHub; it only stops direct pushes from your computer.

### 2.3 Claude Code settings

`.claude/settings.json` (committed) has `permissions.deny` rules that stop Claude Code from running `git push` commands aimed at `main`, such as `git push origin main` and `git push origin HEAD:main`, through its Bash or PowerShell tools. Deny rules apply in every permission mode. They match the command as written, so an unusual form (for example `git -C . push origin main`) is not caught by them; the pre-push hook catches that case. Personal Claude Code settings go in `.claude/settings.local.json`, which git ignores.

### 2.4 Secret scanning in CI

The `Secret scan (gitleaks)` CI job scans the **entire commit history** with [gitleaks](https://github.com/gitleaks/gitleaks) (MIT licence, free for any account) and **fails the check if it finds a secret**. The log shows the file and commit but hides the secret itself.

If it fails:

1. Treat the secret as leaked, even though the repository is private. **Rotate it first** (create a new key or password with the provider and revoke the old one), then update the environment variables where it is used.
2. Remove it from the code. Because the scan covers history, a later commit that deletes the secret does not clear the check. Ask for help to rewrite the branch history before merging.
3. If the finding is a false positive (not a real secret), add `gitleaks:allow` as a comment on that line, or add the finding's fingerprint (shown in the CI log) to a `.gitleaksignore` file, and explain it in the pull request.

**Upgrading gitleaks:** Dependabot does not update it. To upgrade, change `GITLEAKS_VERSION` in `.github/workflows/ci.yml` and replace `GITLEAKS_SHA256` with the `linux_x64.tar.gz` line from that release's `checksums.txt`.

### 2.5 GitHub settings that do work on the free plan

Do these once, and again if the repository is transferred to another account (see Section 9):

1. **Dependabot.** Settings → Advanced Security (or Code security) → turn on *Dependabot alerts* and *Dependabot security updates*. Version updates are already configured in `.github/dependabot.yml`.
2. **Account security.** Turn on two-factor authentication for every GitHub account with access to the repository.
3. **Keep the repository private.** Settings → General → Danger Zone should show *Change visibility: private*.

**If the plan is upgraded** (or the repository moves to an organisation plan that supports these features): add a branch ruleset for `main` (Settings → Rules → Rulesets) that requires a pull request and all four checks above, blocks force pushes, and restricts deletion. Turn on GitHub secret scanning and push protection too. Keep the gitleaks job. Record the change in `docs/DECISIONS.md`.

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

## 9. Account access and recovery

Required by SRS Section 2.2 and NFR-HOST-01. The accounts behind the site may be held under whichever accounts the developer and OGSERC choose. This section records, for each one, who can administer it and how to recover or move it, so the site never depends on a single person being available.

**Never write passwords, keys, recovery codes, or connection strings in this file or anywhere in the repository.** Keep them in a password manager. This file only says *where* they are kept. Keep the names of administrators current; replace each `<placeholder>` when the account is set up.

### 9.1 Rules for every account

- Two-factor authentication is on (NFR-SEC-14). Recovery codes are stored in the password manager, not on the same phone as the authenticator app.
- Where practical, at least two trusted people can administer the account (NFR-HOST-01). Each uses their own login; no shared logins (NFR-SEC-03).
- The account's recovery email address is one that more than one person can read, or is listed below with who controls it.
- When someone leaves, remove their access the same week (NFR-SEC-04) and rotate any keys they could see.
- Review this section every three months and after any change of administrator. Last reviewed: `<date>` by `<name>`.

### 9.2 Account register

| Account | Used for | Provider | Account holder | Administrators | Credentials stored in | Status |
|---|---|---|---|---|---|---|
| GitHub | Source code, CI, Dependabot | GitHub | `thekamiyeoladipo` (personal account) | `<name>`, `<name>` | `<password manager / vault>` | Active |
| Hosting | Runs the website | `<Vercel or Docker host>` | `<account / team name>` | `<name>`, `<name>` | `<password manager / vault>` | Step 13 |
| Database | PostgreSQL (dev branch, staging, production) | `<Neon / Supabase / other>` | `<account / project name>` | `<name>`, `<name>` | `<password manager / vault>` | Dev in use |
| Domain registrar | Domain name registration | `<registrar>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | `<domain to be confirmed>` |
| DNS / CDN / WAF | DNS records, DDoS and bot protection, Turnstile | `<e.g. Cloudflare>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 5 / 13 |
| File storage | Uploaded documents and images (S3-compatible) | `<provider>` | `<account / bucket>` | `<name>`, `<name>` | `<password manager / vault>` | Step 4 |
| Email sending | Contact form delivery (SMTP) | `<provider>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 5 |
| Receiving mailbox | OGSERC inbox for contact form messages | `<provider>` | `<OGSERC mailbox address>` | `<name>` | Held by OGSERC | Step 5 |
| Error and uptime monitoring | Alerts on downtime and errors | `<provider>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 13 |
| Analytics | Privacy-friendly site analytics (FR-WEB-07) | `<Plausible / Umami / self-hosted>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 11 |
| Payment provider | Licence and application fees | `<to be agreed with OGSERC>` | — | — | — | Phase 3 only; do not create before then |

### 9.3 How to recover or move each account

**General recovery**, if an administrator loses access: another administrator signs in and restores access, or resets that person's second factor. If nobody can sign in, use the stored recovery codes. As a last resort, use the provider's account-recovery process, which normally asks for proof of ownership (the recovery email, billing details, or domain DNS control). Do this before the account is needed in an emergency, not during one.

**GitHub**
- Recover: sign in with recovery codes, or use GitHub's account recovery from the sign-in page.
- Move: Settings → General → Danger Zone → *Transfer ownership* to another user or organisation. Issues, pull requests, and history move with it. Afterwards, update `.github/CODEOWNERS`, check that the repository is still private, redo the GitHub settings in Section 2.5, and run `pnpm hooks:install` in any new clone (Section 2.2). If the new account's plan supports branch rulesets and secret scanning, turn them on as described at the end of Section 2.5.

**Hosting**
- Recover: through another member of the hosting team or project, or the provider's recovery process.
- Move: follow Section 7. Set the environment variables (Section 1) on the new host, deploy, test, then switch DNS. On Vercel, a project can also be transferred between teams in its settings.

**Database**
- Recover: through another project member, or the provider's recovery process. The data itself is protected by the backups in Section 6.
- Move: `pg_dump` from the old database and `pg_restore` into the new one (Section 7, step 3), update `DATABASE_URL`, then check with `pnpm migrate:status`. Give the app's database user only the permissions it needs (NFR-SEC-13).

**Domain registrar**
- Recover: through the registrar's account recovery. Keep the registrant contact details current, because recovery often depends on them.
- Move: export the DNS records first. Then remove the registrar lock, get the transfer (EPP/auth) code, start the transfer at the new registrar, and turn the lock back on. Domain transfers can take several days; do not schedule one close to a launch. Re-check DNSSEC afterwards.

**DNS / CDN / WAF**
- Recover: through another account member, or the provider's recovery process.
- Move: export all DNS records (including SPF, DKIM, DMARC), recreate them at the new provider, then change the domain's nameservers at the registrar. Turnstile keys are tied to the account: create new ones and update `TURNSTILE_*`.

**File storage**
- Recover: through another account member, or the provider's recovery process.
- Move: create the new bucket, copy all objects across with the provider's sync tool or any S3-compatible copy tool, update the `S3_*` variables, then check that documents download on the site. Commands are added in build step 4.

**Email sending**
- Recover: through another account member, or the provider's recovery process.
- Move: set up the new provider, update the SPF and DKIM DNS records (and DMARC if needed) (NFR-SEC-15), update the `SMTP_*` and `EMAIL_FROM` variables, then send a test message through the contact form.

**Receiving mailbox**
- Held by OGSERC. To change it, update `CONTACT_FORM_TO` and send a test message through the contact form.

**Error and uptime monitoring / Analytics**
- Recover: through another account member, or the provider's recovery process.
- Move: create the new account and replace the site key or snippet configuration. Historic data usually stays with the old provider; export it first if it is needed.

**Payment provider (Phase 3)**
- Not set up in Phase 1. When it is, add its recovery and move steps here, including how webhook signing secrets are rotated (NFR-SEC-21).

## 10. Planned upgrades

Dependabot is told to **ignore some major versions** on purpose (D-022 in `docs/DECISIONS.md`): TypeScript, ESLint, `@types/node`, and the Docker Node image. **Ignored majors never arrive as pull requests**, so nobody is reminded about them automatically. Review them on purpose:

- **every three months**, and
- **straight away** when a security notice (GitHub Dependabot alert, `pnpm audit`, or the project's own advisory) mentions one of them.

For each one, check whether the reason in D-022 still holds. For example: do Payload and Next.js now support the new TypeScript major? Do the Next.js lint plugins now support the new ESLint major? Is a newer Node version now the active LTS and supported by Payload and Next.js? If the reason has gone, upgrade in a dedicated pull request, run the full CI, and record it in `docs/DECISIONS.md`.

**Node.js upgrades must change everything in one pull request:**

- `.nvmrc` (used by CI and developers)
- both `FROM node:…-alpine` lines in the `Dockerfile`
- `@types/node` in `package.json` (to the same major)
- the `engines.node` range in `package.json`, if it needs to change
- `.github/workflows/ci.yml`, if anything there refers to a Node version

Never upgrade only one of these; production, CI, and development must run the same Node major.

Last review: `<date>` by `<name>`. Next review due: `<date + 3 months>`.

## 11. Placeholders to remove before launch

Build step 2 added temporary placeholders so OGSERC could review the design before real content existed. Step 13 (launch checklist) must confirm every item below is gone:

- [ ] `src/lib/placeholder-content.ts` deleted; all homepage content comes from the CMS (replaced in step 4, D-028).
- [ ] No text containing "OGSERC to supply" on any page (search the site and the database).
- [x] The `ink` colour set to `#483A16`, sampled from OGSERC's full logo lockup (D-033). Re-run the checks if OGSERC supplies an exact brand value.
- [x] Crest placeholder replaced with the Ogun State crest image (step 2b).
- [x] Hero photographs supplied (step 2b, D-037).
- [ ] `docs/ASSET-CREDITS.md` has no "TO CONFIRM" left: every image's source, licence and permission recorded (D-034).
- [ ] Hero slide headlines and action wording supplied by OGSERC (`[Sample headline …]` gone).
- [ ] The inline splash script is hashed in, or moved out of, the Content-Security-Policy (step 12, D-038).
- [ ] Contact section map added (or removed) once the office address is confirmed.
- [ ] `src/app/(frontend)/design-system/` (the review page) deleted (D-031).
- [ ] No menu entry in `src/lib/navigation.ts` still has `ready: false`, and `/being-prepared` is removed or unused (D-027).
