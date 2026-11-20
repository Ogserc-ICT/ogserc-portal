#!/bin/sh
# Audit log retention (D-083, RUNBOOK Section 6): blanks the internet address and browser of entries
# older than AUDIT_IP_RETENTION_DAYS (default 90) and deletes entries older than
# AUDIT_RETENTION_DAYS (default 730, two years). Both can be set in .env. Run monthly by cron as
# the deploy user:
#   45 3 1 * * /opt/ogserc/deploy/prune-audit.sh >> /var/backups/ogserc/prune-audit.log 2>&1
# Check it without changing anything (reports the counts, then undoes them):
#   /opt/ogserc/deploy/prune-audit.sh --dry-run
set -eu

cd "$(dirname "$0")/.."
finish=COMMIT
if [ "${1:-}" = "--dry-run" ]; then
  finish=ROLLBACK
fi

env_value() { sed -n "s/^$1=//p" .env | tail -n 1; }
ip_days=$(env_value AUDIT_IP_RETENTION_DAYS)
keep_days=$(env_value AUDIT_RETENTION_DAYS)
ip_days=${ip_days:-90}
keep_days=${keep_days:-730}

# Whole numbers only: they go into the SQL as psql variables.
for value in "$ip_days" "$keep_days"; do
  case $value in
    '' | *[!0-9]*) echo "AUDIT_IP_RETENTION_DAYS and AUDIT_RETENTION_DAYS must be whole numbers of days" >&2; exit 1 ;;
  esac
done
if [ "$ip_days" -lt 1 ] || [ "$ip_days" -gt "$keep_days" ]; then
  echo "AUDIT_IP_RETENTION_DAYS must be at least 1 and no more than AUDIT_RETENTION_DAYS" >&2
  exit 1
fi

{
  echo 'BEGIN;'
  cat deploy/prune-audit.sql
  echo "$finish;"
} | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U ogserc -d ogserc -v ON_ERROR_STOP=1 -v ip_days="$ip_days" -v keep_days="$keep_days"

echo "$(date -u +%FT%TZ) audit prune ok (addresses after $ip_days days, entries after $keep_days days, $finish)"
