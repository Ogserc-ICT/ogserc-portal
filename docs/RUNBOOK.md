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
| `UMAMI_WEBSITE_ID` | No | Turns on visitor statistics (D-077). Needed at build time; set only for the live site. |
| `UMAMI_DB_PASSWORD`, `UMAMI_APP_SECRET`, `UMAMI_2FA_KEY` | VPS only | Umami's database password, session secret and two-factor key (Section 5, step I). |

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

### VPS with Docker Compose (AlmaLinux 8): the OGSERC server (D-054)

`docker-compose.prod.yml` runs three containers: the app, PostgreSQL 17 and Caddy. Caddy is the only one reachable from the internet (ports 80 and 443); it gets and renews the HTTPS certificate from Let's Encrypt and passes requests to the app. The image is built on the server (the build needs no database), so no registry token is stored there. Migrations run when the app starts.

**Preview period.** Until Step 3 is finished (2FA, rate limiting, audit log), `deploy/Caddyfile` returns 404 for `/admin` and `/api` and shortens HSTS to one day for this host only. Both are marked `PREVIEW ONLY` and listed in Section 11. Search engines have been allowed to list the site since 2026-11-18 (D-078).

Commands run on the server over SSH. Never paste passwords, keys or the contents of `.env` into chat, tickets or commits.

**A. Check the server first** (as root). Stop if anything already listens on port 80 or 443 (a control panel, Apache or nginx), or if `sshd` is not on port 22: the later steps assume neither.
```sh
cat /etc/almalinux-release; free -h; df -h /
ss -tlnp | grep -E ':(22|80|443)\b'
rpm -q podman buildah runc httpd nginx
getenforce
```

Also check the swap (`swapon --show`) and the CPU: `grep -cw sse4_1 /proc/cpuinfo; grep -cw sse4_2 /proc/cpuinfo`. If either prints 0, the virtual CPU cannot run sharp (image processing) at all, native or WebAssembly (D-056). Ask the host to set the CPU type to "host" or "x86-64-v2"; until then, add `IMAGE_PROCESSING=off` to the server's `.env` (step E), which serves images unoptimised.

**B. Updates, swap, firewall, Docker** (as root). Paste one block at a time and check each for errors. Minimal server images (OGSERC's VPS was one) lack `firewalld` and `needs-restarting`, so both are installed here.
```sh
dnf -y update
dnf -y install git cronie dnf-automatic dnf-utils firewalld
sed -i -E 's/^upgrade_type = .*/upgrade_type = security/; s/^apply_updates = .*/apply_updates = yes/' /etc/dnf/automatic.conf
systemctl enable --now dnf-automatic.timer crond
```
Swap, **only if `swapon --show` printed nothing** (OGSERC's VPS already had 2 GB at `/swapfile`, which is enough; these lines would break an existing `/swapfile`):
```sh
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap defaults 0 0' >> /etc/fstab
```
Firewall. firewalld 0.9 refuses services and ports in one command, so they are separate. SSH is allowed from the moment it starts. Cockpit (the web admin panel, port 9090) is closed.
```sh
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=443/udp
firewall-cmd --permanent --remove-service=cockpit
firewall-cmd --reload
firewall-cmd --list-all            # services: dhcpv6-client http https ssh; ports: 443/udp
```
Docker:
```sh
# Docker CE replaces AlmaLinux's podman, which conflicts with it.
dnf -y remove podman buildah runc || true
dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker run --rm hello-world
docker compose version
```
Restart if the update installed a new kernel (the session drops; log in again after a minute):
```sh
needs-restarting -r || reboot
```

**C. A deploy user** (as root). Membership of the `docker` group is equivalent to root on this server, so give it only to people who run deploys.
Run `passwd deploy` on its own line, not inside a pasted block: it reads the next pasted lines as the password. The same goes for `ssh`, which swallows the lines pasted after it.
```sh
useradd -m -s /bin/bash deploy
usermod -aG docker,wheel deploy
passwd deploy                      # for sudo; store it in OGSERC's password manager
mkdir -p /home/deploy/.ssh /opt/ogserc /var/backups/ogserc
cp ~/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
chown -R deploy: /home/deploy/.ssh /opt/ogserc /var/backups/ogserc
chmod 700 /home/deploy/.ssh
```
Root's `authorized_keys` may hold only the host's key, not yours (it did on OGSERC's VPS: `ssh deploy@…` asked for the password). Add your own key from your computer (Windows PowerShell): `ssh-keygen -t ed25519` (with a passphrase), then
`type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh deploy@SERVER_IP "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"`.
Check that `ssh deploy@SERVER_IP` works without the server password before step H.

**If the repository was already cloned as root** (as on OGSERC's VPS, into `/root/ogserc-portal` with the deploy key `/root/.ssh/github_ogserc`), move both to `deploy` instead of step D, then as `deploy` run `git -C /opt/ogserc config --unset core.sshCommand || true`:
```sh
cd ~
mv /root/.ssh/github_ogserc /root/.ssh/github_ogserc.pub /home/deploy/.ssh/
printf 'Host github.com\n  IdentityFile ~/.ssh/github_ogserc\n  IdentitiesOnly yes\n' > /home/deploy/.ssh/config
cp /root/.ssh/known_hosts /home/deploy/.ssh/
rmdir /opt/ogserc && mv /root/ogserc-portal /opt/ogserc
chown -R deploy: /home/deploy/.ssh /opt/ogserc && chmod 600 /home/deploy/.ssh/*
```

**D. Get the code** (as `deploy`). The server gets a read-only deploy key for this repository only.
```sh
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "ogserc-vps read-only"
cat ~/.ssh/github_deploy.pub
```
Add the printed public key in GitHub: repository Settings, Deploy keys, Add deploy key, leaving "Allow write access" off. Then:
```sh
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config && chmod 600 ~/.ssh/config
git clone git@github.com:thekamiyeoladipo/ogserc-portal.git /opt/ogserc
```

**E. The server's `.env`** (as `deploy`). The secrets are generated on the server and never displayed. Replace the `ACME_EMAIL` value with a shared OGSERC IT mailbox.
```sh
cd /opt/ogserc
umask 077
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
PAYLOAD_SECRET=$(openssl rand -hex 48)
SITE_DOMAIN=ogserc.org.ng
SITE_URL=https://ogserc.org.ng
ACME_EMAIL=it-mailbox@ogserc.org.ng
EOF
awk -F= '{print $1 ": " length($2) " characters"}' .env   # lengths only, never the values
git check-ignore -q .env && echo ".env is ignored by git"
```
Set the real mailbox in the `ACME_EMAIL` line before pasting (minimal images have no `nano`; `vi .env` works).
Keep a copy of `.env` in OGSERC's password manager: without `POSTGRES_PASSWORD` and `PAYLOAD_SECRET` a database restore cannot be used.

**F. DNS.** At the domain's DNS provider, create (or change) `A` records for `ogserc.org.ng` and `www.ogserc.org.ng` pointing to the server's IP address. Do not touch `MX`, `TXT` or other records (email). Wait until `nslookup ogserc.org.ng` from your own computer returns the server's IP.

**G. Start and check** (as `deploy`, in `/opt/ogserc`). The first build takes several minutes.
```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps                   # all three "running", db "healthy"
docker compose -f docker-compose.prod.yml logs --tail 50 app caddy
curl -sI https://ogserc.org.ng | head -n 1                     # HTTP/2 200
curl -s -o /dev/null -w '%{http_code}\n' https://ogserc.org.ng/admin   # 404 during the preview
```

**H. Close password logins** (as `deploy` with `sudo`, only after `ssh deploy@SERVER_IP` works with the key). Keep the current session open and test from a second window before closing it.
```sh
sudo sed -i -E 's/^#?PasswordAuthentication .*/PasswordAuthentication no/; s/^#?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl restart sshd      # restart: on OGSERC's VPS a reload did not apply it
sudo sshd -T | grep -Ei "^(passwordauthentication|permitrootlogin)"   # both "no"
```
`sshd -T` reads the files, not the running server, so check from your own computer as well. A login that offers only a password must be refused without `password` in the list of methods:
```sh
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no deploy@SERVER_IP
# expected: Permission denied (publickey,gssapi-keyex,gssapi-with-mic).
```
Existing sessions stay open through the restart.

**I. Visitor statistics with Umami** (D-077, as `deploy`, in `/opt/ogserc`). Do this once; later deploys need nothing extra.
1. **DNS:** add an `A` record for `stats.ogserc.org.ng` pointing to the server's IP. Wait until `nslookup stats.ogserc.org.ng` returns it.
2. **Secrets**, generated on the server and never displayed:
   ```sh
   cd /opt/ogserc && umask 077
   for v in UMAMI_DB_PASSWORD UMAMI_APP_SECRET UMAMI_2FA_KEY; do
     grep -q "^$v=" .env || echo "$v=$(openssl rand -hex 32)" >> .env
   done
   awk -F= '{print $1 ": " length($2) " characters"}' .env
   ```
   Copy the updated `.env` into OGSERC's password manager. Without `UMAMI_APP_SECRET` and `UMAMI_2FA_KEY`, a restored statistics database cannot be signed into.
3. **Database:** start PostgreSQL if it is not running, then create Umami's database and user:
   ```sh
   git pull --ff-only
   docker compose -f docker-compose.prod.yml up -d db
   ./deploy/create-analytics-db.sh                 # "analytics database ready"
   ```
4. **Start Umami and reload Caddy:**
   ```sh
   docker compose -f docker-compose.prod.yml up -d umami
   # A restart, not `up`: Caddy only reads the changed Caddyfile when it starts again.
   docker compose -f docker-compose.prod.yml restart caddy
   docker compose -f docker-compose.prod.yml logs --tail 30 umami     # "Ready" and no "Illegal instruction"
   curl -s -o /dev/null -w '%{http_code}\n' https://ogserc.org.ng/pulse/p.js   # 200
   ```
5. **First sign-in** at `https://stats.ogserc.org.ng` with `admin` / `umami`. Umami makes you change the password straight away. Then:
   - turn on two-factor sign-in (Profile);
   - create a named account for each person who needs one, each with two-factor sign-in;
   - rename or delete `admin`.
   Store the passwords in the password manager.
6. **Add the website** (Settings, Websites, Add: name "OGSERC", domain `ogserc.org.ng`) and copy its **Website ID**. Add it to `.env` and rebuild the app, because pages are built with it:
   ```sh
   echo 'UMAMI_WEBSITE_ID=paste-the-id-here' >> .env
   docker compose -f docker-compose.prod.yml up -d --build app
   curl -s https://ogserc.org.ng | grep -o 'data-website-id="[^"]*"'
   ```
   Open the site in a normal browser window (without Do Not Track) and check that the visit appears on the dashboard within a minute. If it does not, open the browser's developer tools (F12), Network tab, reload, and filter on `pulse`: `p.js` and a POST to `/pulse/e` should both return 200. A curl to `/pulse/e` does not prove this, because the browser builds the address itself (D-077).

Umami's data stays out of the app: if Umami stops, the site keeps working and only the counting pauses.

**Updating** (as `deploy`). Deploy only what is merged to `main` with CI green.
```sh
cd /opt/ogserc && git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```
If the update changed `deploy/Caddyfile`, also run `docker compose -f docker-compose.prod.yml restart caddy`: `up` does not notice a changed file mounted into a running container.

**Rolling back:** `git checkout <previous commit>` and run the same `up -d --build`. Migrations only go forward, so after a release that changed the database, restore the backup taken before it (Section 6) instead.

**Local portability check** (production image plus a throwaway local Postgres; requires Docker):

```sh
PAYLOAD_SECRET=any-long-random-string docker compose up --build
```

## 6. Backups and restore *(to be completed in step 13)*

**VPS (D-054).** `deploy/backup-db.sh` writes a compressed `pg_dump` to `/var/backups/ogserc` and keeps 14 days. Once the statistics database exists (D-077), it also writes `umami-*.dump` the same way; restore it as below with `-d umami` and `umami-….dump`, stopping `umami` instead of `app`. Install it once, as `deploy`, and run it once by hand to check:
```sh
(crontab -l 2>/dev/null; echo '15 2 * * * /opt/ogserc/deploy/backup-db.sh >> /var/backups/ogserc/backup.log 2>&1') | crontab -
/opt/ogserc/deploy/backup-db.sh
```
With `HC_BACKUP_PING_URL` in `.env`, each run reports to Healthchecks.io: success, failure, or nothing arrived (Section 8, D-079).
These copies are on the same server, so they do not survive losing it. The off-server copy below covers that.

**Off-server copies (D-080).** After each nightly backup, `deploy/offsite-backup.sh` sends an encrypted copy to Backblaze B2 using restic, from its pinned Docker image.
- **What is copied:** the latest site and statistics dumps, and `.env`.
- **Kept:** 7 daily, 4 weekly and 3 monthly copies.
- **Monitoring:** the Healthchecks.io backup check fails if this step fails.
- **Encryption:** everything is encrypted on the server before upload with `OFFSITE_PASSWORD`. **Without that password nobody can open the copies, us included.** Keep it in OGSERC's password manager, separately from the server.

Set up once:
1. **Backblaze account.** At backblaze.com, sign up for B2 Cloud Storage with the shared OGSERC IT mailbox, choosing the **EU Central** region at sign-up. Turn on two-factor authentication.
2. **Bucket.** Create a bucket with a unique name (for example `ogserc-backups-` plus a few random letters), set it to **Private**, and leave Object Lock off. Then set its *Lifecycle Settings* to **Keep only the last version of the file**, so copies restic deletes really go. Note the bucket's **Endpoint** (for example `s3.eu-central-003.backblazeb2.com`).
3. **Application key.** Under *Application Keys → Add a New Application Key*, give it access to **that bucket only**, with **Read and Write**. Note the **keyID** and **applicationKey**; the key is shown only once.
4. **Server settings.** As `deploy` in `/opt/ogserc`, run each `read` line on its own and paste the value when asked:
   ```sh
   read -r -p 'Endpoint: ' ep
   read -r -p 'Bucket name: ' bk
   read -r -p 'keyID: ' ki
   read -r -p 'applicationKey: ' ks
   ```
   then:
   ```sh
   umask 077
   sed -i '/^OFFSITE_/d' .env
   printf 'OFFSITE_REPOSITORY=s3:https://%s/%s/ogserc\nOFFSITE_KEY_ID=%s\nOFFSITE_KEY_SECRET=%s\nOFFSITE_PASSWORD=%s\n' "$ep" "$bk" "$ki" "$ks" "$(openssl rand -hex 32)" >> .env
   unset ep bk ki ks
   grep '^OFFSITE_' .env | sed -E 's/=.*/=(set)/'
   ```
   Copy the updated `.env` into the password manager now. Its `OFFSITE_PASSWORD` is the encryption password.
5. **Create the repository and make the first copy:**
   ```sh
   ./deploy/offsite-backup.sh init
   ./deploy/backup-db.sh                       # ends with "offsite ok"
   ./deploy/offsite-backup.sh snapshots
   ```

**Restore test.** `deploy/test-restore.sh` restores the latest off-server copy into a temporary database on the server, checks that it holds the site's tables, migrations and statistics, then removes everything it created. The live site is not touched. Until Payload first starts on the server (Step 3, when `/admin` opens), the live site database has no tables; the test then checks that the copy is empty too and relies on the statistics database. Run it before launch and then every three months; it ends with `RESTORE TEST PASSED`. `./deploy/offsite-backup.sh check` verifies the repository itself.

**After losing the server:**
1. Set up a new one (Section 5).
2. Put the four `OFFSITE_*` lines from the password manager into an empty `/opt/ogserc/.env`.
3. Restore the copy into a folder:
   ```sh
   cd /opt/ogserc && . ./deploy/restic-env.sh
   mkdir -p /var/backups/ogserc/recovered
   RESTIC_USER="$(id -u):$(id -g)" RESTIC_MOUNT=/var/backups/ogserc/recovered:/restore restic restore latest --host ogserc-vps --target /restore
   ```
4. Copy `recovered/data/env` over `.env`.
5. Start the database (`up -d db`) and create Umami's (`./deploy/create-analytics-db.sh`).
6. Restore each dump with `pg_restore` as below, then start the rest.

**Two-year limit on visitor statistics (D-077).** The Privacy Policy promises that statistics are deleted after two years. `deploy/prune-analytics.sh` does this once a month, and it deletes only visitor data, never accounts, websites or reports. Dumps are kept for 14 days on the server and up to 3 months off it (D-080), so deleted data leaves every backup within 3 months. Install it once, as `deploy`, and check it with a dry run, which reports what it would delete and then undoes it:
```sh
(crontab -l 2>/dev/null; echo '30 3 1 * * /opt/ogserc/deploy/prune-analytics.sh >> /var/backups/ogserc/prune-analytics.log 2>&1') | crontab -
/opt/ogserc/deploy/prune-analytics.sh --dry-run
```
Each table should report `0 rows … deleted` until November 2028, and the last line reads `prune ok (ROLLBACK)`. A `WARNING … skipped` line means a Umami upgrade changed a table: review the list in the script.

Restore a dump into the running database (this replaces its contents):
```sh
cd /opt/ogserc
docker compose -f docker-compose.prod.yml stop app
docker compose -f docker-compose.prod.yml exec -T db pg_restore -U ogserc -d ogserc --clean --if-exists < /var/backups/ogserc/ogserc-YYYYMMDDTHHMMSSZ.dump
docker compose -f docker-compose.prod.yml start app
```

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

**Visitor statistics (D-077):** the Umami dashboard at `https://stats.<domain>` shows visitors, pages, referring sites, devices, countries and site searches. Staff who only need to read can be sent a share link (Website settings, Share URL) instead of an account.

**Uptime:** UptimeRobot checks the site every 5 minutes and sends an email and a phone-app alert when a check fails. It runs three monitors:
- **`OGSERC website`:** a keyword check on the homepage for "Ogun State Electricity Regulatory Commission", so it also catches a broken page that still loads.
- **`OGSERC contact page`:** this page is rendered on each request, so it proves the app is running.
- **`OGSERC statistics`:** the Umami dashboard.

When an alert arrives, run `docker compose -f docker-compose.prod.yml ps` and `logs --tail 100 app caddy` on the server (Section 5).

**Disk and backup alerts (D-079):** Healthchecks.io alerts by email and phone app if the disk reaches 80%, if a nightly backup fails, or if either check stops reporting.
1. **Create the account:** a free Healthchecks.io account with the shared OGSERC IT mailbox, with two-factor sign-in on.
2. **Add two checks** (*Add Check*):
   - `OGSERC disk space`: Period 30 minutes, Grace 1 hour;
   - `OGSERC nightly backup`: Period 1 day, Grace 3 hours.
3. **Store the ping URLs:** copy each check's ping URL into the server's `.env`, as `deploy` in `/opt/ogserc`. Use `vi .env` rather than `echo`, so the URL does not land in the shell history:
   ```
   HC_DISK_PING_URL=https://hc-ping.com/…
   HC_BACKUP_PING_URL=https://hc-ping.com/…
   ```
4. **Schedule the disk check and test it:**
   ```sh
   (crontab -l 2>/dev/null | grep -v check-disk; echo '*/30 * * * * /opt/ogserc/deploy/check-disk.sh > /dev/null 2>&1') | crontab -
   /opt/ogserc/deploy/check-disk.sh           # "disk N% (limit 80%)"; the check turns green
   ```
5. **If an alert arrives:**
   - **Disk:** run `df -h` and `docker system df`. `docker image prune -f` and `docker builder prune -f` usually free the most; old dumps in `/var/backups/ogserc` are the next place to look.
   - **Backup:** read `/var/backups/ogserc/backup.log`.

**Server log report (D-079):** each night `deploy/log-report.sh` turns Caddy's visit log for the last 14 days into one GoAccess page. It shows file and PDF downloads, crawlers (Googlebot included), 404s and other errors, suspicious requests and bandwidth: everything the visitor statistics cannot see.
- **Install once**, as `deploy`:
  ```sh
  (crontab -l 2>/dev/null | grep -v log-report; echo '40 2 * * * /opt/ogserc/deploy/log-report.sh >> /var/backups/ogserc/log-report.log 2>&1') | crontab -
  /opt/ogserc/deploy/log-report.sh           # "report ok: /var/backups/ogserc/reports/report.html"
  ```
- **View it** from your own computer (Windows PowerShell), using the same SSH key as for deploys:
  ```
  scp deploy@ogserc.org.ng:/var/backups/ogserc/reports/report.html $env:USERPROFILE\Downloads\ogserc-server-log.html
  start $env:USERPROFILE\Downloads\ogserc-server-log.html
  ```
- **Delete the downloaded copy afterwards.** It contains visitors' IP addresses, which the server keeps for only 14 days.

**Search engines (D-078):** the site publishes `/robots.txt` and `/sitemap.xml`. Set up once after the first deploy that has them:
1. **Google Search Console** (search.google.com/search-console), signed in with an account OGSERC controls:
   - Add a **Domain** property for the domain.
   - Add the `TXT` record Google shows at the DNS provider. Change no other records.
   - Click Verify. Verification can take up to a day.
   - Then go to *Sitemaps* and submit `sitemap.xml`.
2. **Bing Webmaster Tools** (bing.com/webmasters): choose *Import from Google Search Console*. Bing also serves DuckDuckGo and Yahoo.
3. **Check monthly:** use Search Console's *Pages* report for pages Google could not index, and its *Performance* report for the search words people use. These complement the visitor statistics.

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
| Backup storage | Encrypted off-server backup copies (D-080) | Backblaze B2 (EU Central) | `<shared OGSERC IT mailbox>`, bucket `<name>` | `<name>`, `<name>` | `<password manager / vault>`, with `OFFSITE_PASSWORD` | Being set up |
| Email sending | Contact form delivery (SMTP) | `<provider>` | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Step 5 |
| Receiving mailbox | OGSERC inbox for contact form messages | `<provider>` | `<OGSERC mailbox address>` | `<name>` | Held by OGSERC | Step 5 |
| Error and uptime monitoring | Alerts on downtime and errors | UptimeRobot (free plan) | `<shared OGSERC IT mailbox>` | `<name>`, `<name>` | `<password manager / vault>` | Uptime active; error alerts step 13 |
| Search engine consoles | Indexing reports, sitemap, search words (D-078) | Google Search Console, Bing Webmaster Tools | `<account>` | `<name>`, `<name>` | `<password manager / vault>` | Active |
| Disk and backup alerts | Disk space and nightly backup checks (D-079) | Healthchecks.io (free plan) | `<shared OGSERC IT mailbox>` | `<name>`, `<name>` | `<password manager / vault>` | Being set up |
| Analytics | Privacy-friendly site analytics (FR-WEB-07) | Umami, self-hosted on the VPS (D-077) | `stats.<domain>` (named accounts, two-factor sign-in) | `<name>`, `<name>` | `<password manager / vault>` | Being set up |
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

**Backup storage (Backblaze B2)**
- Recover: through another account member, or Backblaze's recovery process. The copies themselves open only with `OFFSITE_PASSWORD`, so losing the account does not expose them, but losing the password makes them unusable.
- Move: create a bucket and key at the new S3-compatible provider, run `./deploy/offsite-backup.sh init` with the new `OFFSITE_REPOSITORY` and keys, and keep the old account until the new one holds 3 months of copies.

**Email sending**
- Recover: through another account member, or the provider's recovery process.
- Move: set up the new provider, update the SPF and DKIM DNS records (and DMARC if needed) (NFR-SEC-15), update the `SMTP_*` and `EMAIL_FROM` variables, then send a test message through the contact form.

**Receiving mailbox**
- Held by OGSERC. To change it, update `CONTACT_FORM_TO` and send a test message through the contact form.

**Error and uptime monitoring / Analytics / Disk and backup alerts**
- Recover: through another account member, or the provider's recovery process.
- Move: create the new account and replace the site key or snippet configuration. Historic data usually stays with the old provider; export it first if it is needed. For Healthchecks.io, create the two checks again and replace `HC_DISK_PING_URL` and `HC_BACKUP_PING_URL` in the server's `.env`. Healthchecks.io is open source, so it can also be self-hosted.

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

**Umami** (D-077) is pinned in `docker-compose.prod.yml`, which Dependabot does not watch. At each review, and whenever the dashboard shows an update notice, read the [release notes](https://github.com/umami-software/umami/releases). Then change the tag and run `docker compose -f docker-compose.prod.yml up -d umami`. Apply security releases straight away. Back up first (Section 6), because upgrades can migrate its database. After an upgrade, run `deploy/prune-analytics.sh --dry-run` and check that it reports no `WARNING` lines.

Last review: `<date>` by `<name>`. Next review due: `<date + 3 months>`.

## 11. Placeholders to remove before launch

Build step 2 added temporary placeholders so OGSERC could review the design before real content existed. Step 13 (launch checklist) must confirm every item below is gone:

- [ ] `src/lib/placeholder-content.ts` deleted; all homepage content comes from the CMS (replaced in step 4, D-028).
- [ ] No text containing "OGSERC to supply" on any page (search the site and the database).
- [x] The `ink` colour set to `#483A16`, sampled from OGSERC's full logo lockup (D-033). Re-run the checks if OGSERC supplies an exact brand value.
- [x] Crest placeholder replaced with the Ogun State crest image (step 2b).
- [x] Hero photographs supplied (step 2b, D-037).
- [ ] `docs/ASSET-CREDITS.md` has no "TO CONFIRM" left: every image's source, licence and permission recorded (D-034).
- [x] Hero slide headlines and action wording: slide 1 is OGSERC's tagline; the slide 2 and 3 headlines were drafted for the owner (D-057). OGSERC to confirm them before launch.
- [ ] The inline splash script is hashed in, or moved out of, the Content-Security-Policy (step 12, D-038).
- [x] Contact section map added, loading from Google only on request (D-058). The strict CSP must allow `frame-src https://www.google.com` (step 12).
- [ ] `src/lib/documents/catalogue.ts` emptied: every document moved into the Documents collection, its PDF into object storage, and `public/documents/` deleted (step 6, D-060).
- [ ] The contact form sends email, with rate limiting, a configurable inbox and SPF/DKIM/DMARC; until then it offers a `mailto:` link (D-059).
- [ ] `src/app/(frontend)/design-system/` (the review page) deleted (D-031).
- [ ] No menu entry in `src/lib/navigation.ts` still has `ready: false`, and `/being-prepared` is removed or unused (D-027).
- [ ] `deploy/Caddyfile` has no `PREVIEW ONLY` block left (D-054): `/admin` reopened once Step 3 is merged (2FA, rate limiting, audit log); `X-Robots-Tag: noindex` removed (done 2026-11-18, D-078); the HSTS override removed once every subdomain of the domain serves HTTPS.
- [ ] VPS backups copied off the server daily, and a restore tested (Section 6).
- [x] Privacy Policy section 7 covers cookies and visitor statistics: wording approved by the owner on 2026-11-18 (D-077). OGSERC's legal advisers to review it with the rest of the policy (D-074).
- [ ] `stats.<domain>`'s one-day HSTS lengthened with the main site's (D-077).
- [x] The monthly `deploy/prune-analytics.sh` cron job installed on the VPS, and its dry run clean (Section 6; done 2026-11-18).
- [ ] `IMAGE_PROCESSING=off` gone from the VPS's `.env` once its CPU shows `sse4_1` and `sse4_2` (D-056), then the setting, its CI job and `scripts/block-sharp-binaries.mjs` removed from the code, and D-055's `@img/sharp-wasm32` reconsidered.
