#!/bin/sh
# Nightly database dump on the VPS (RUNBOOK Section 6). Run by cron as the deploy user:
#   15 2 * * * /opt/ogserc/deploy/backup-db.sh >> /var/backups/ogserc/backup.log 2>&1
# Keeps 14 days of dumps in /var/backups/ogserc. Copying them off the server is a separate step.
set -eu

cd "$(dirname "$0")/.."
dir=/var/backups/ogserc

# Healthchecks.io (D-079): a ping when the backup succeeds, /fail when it does not. Without
# HC_BACKUP_PING_URL in .env the backup still runs, unwatched.
hc=$(sed -n 's/^HC_BACKUP_PING_URL=//p' .env 2>/dev/null || true)
ping_hc() {
  if [ -n "$hc" ]; then curl -fsS -m 10 --retry 3 "$hc$1" > /dev/null 2>&1 || true; fi
}
trap 'status=$?; if [ "$status" -ne 0 ]; then ping_hc /fail; fi' EXIT

dump="$dir/ogserc-$(date -u +%Y%m%dT%H%M%SZ).dump"

# Written under a temporary name first, so a failed dump never looks like a good one.
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U ogserc -d ogserc -Fc > "$dump.part"
mv "$dump.part" "$dump"
echo "$(date -u +%FT%TZ) backup ok: $dump"

# Visitor statistics (D-077), once its database exists.
if docker compose -f docker-compose.prod.yml exec -T db psql -U ogserc -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'umami'" | grep -q 1; then
  stats="$dir/umami-$(date -u +%Y%m%dT%H%M%SZ).dump"
  docker compose -f docker-compose.prod.yml exec -T db pg_dump -U ogserc -d umami -Fc > "$stats.part"
  mv "$stats.part" "$stats"
  echo "$(date -u +%FT%TZ) backup ok: $stats"
fi

find "$dir" \( -name 'ogserc-*.dump' -o -name 'umami-*.dump' \) -mtime +14 -delete
find "$dir" -name '*.dump.part' -mtime +1 -delete

# Encrypted off-server copy (D-080), once configured. A failure here fails the backup check too.
if grep -q '^OFFSITE_REPOSITORY=.' .env 2>/dev/null; then
  ./deploy/offsite-backup.sh
fi
ping_hc ""
