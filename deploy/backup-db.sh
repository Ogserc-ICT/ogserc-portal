#!/bin/sh
# Nightly database dump on the VPS (RUNBOOK Section 6). Run by cron as the deploy user:
#   15 2 * * * /opt/ogserc/deploy/backup-db.sh >> /var/backups/ogserc/backup.log 2>&1
# Keeps 14 days of dumps in /var/backups/ogserc. Copying them off the server is a separate step.
set -eu

cd "$(dirname "$0")/.."
dir=/var/backups/ogserc
dump="$dir/ogserc-$(date -u +%Y%m%dT%H%M%SZ).dump"

# Written under a temporary name first, so a failed dump never looks like a good one.
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U ogserc -d ogserc -Fc > "$dump.part"
mv "$dump.part" "$dump"
find "$dir" -name 'ogserc-*.dump' -mtime +14 -delete
find "$dir" -name 'ogserc-*.dump.part' -mtime +1 -delete
echo "$(date -u +%FT%TZ) backup ok: $dump"
