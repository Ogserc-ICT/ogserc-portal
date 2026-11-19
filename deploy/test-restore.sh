#!/bin/sh
# Restore test (D-080, RUNBOOK Section 6). Restores the latest off-server copy into a temporary
# PostgreSQL container on this server, checks that it holds the site's data, then removes everything
# it created. The live site and its database are not touched. Run by hand as the deploy user,
# before launch and then every three months:
#   /opt/ogserc/deploy/test-restore.sh
set -eu

cd "$(dirname "$0")/.."
. ./deploy/restic-env.sh

name=ogserc-restore-test
work=$(mktemp -d /var/backups/ogserc/restore-test.XXXXXX)
chmod 700 "$work"
cleanup() {
  docker rm -f "$name" > /dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

fail() {
  echo "RESTORE TEST FAILED: $1" >&2
  exit 1
}

echo "--- latest off-server copy:"
restic snapshots --host "$OFFSITE_HOST" --latest 1
RESTIC_USER="$(id -u):$(id -g)" RESTIC_MOUNT="$work:/restore" \
  restic restore latest --host "$OFFSITE_HOST" --target /restore
data=$work/data
[ -s "$data/ogserc.dump" ] || fail "the copy has no site database dump"
[ -s "$data/env" ] || fail "the copy has no .env"
echo "--- .env restored: yes"

# A throwaway database with no published port; trust authentication is safe for that reason.
docker run -d --name "$name" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine > /dev/null
i=0
until docker logs "$name" 2>&1 | grep -q 'PostgreSQL init process complete' &&
  docker exec "$name" pg_isready -U postgres -q; do
  i=$((i + 1))
  [ "$i" -lt 90 ] || fail "the temporary database did not start"
  sleep 1
done

query() { docker exec "$name" psql -U postgres -d "$1" -tAc "$2"; }

docker exec "$name" createdb -U postgres restore_site
docker exec -i "$name" pg_restore -U postgres -d restore_site --no-owner --no-acl < "$data/ogserc.dump" ||
  echo "(pg_restore reported warnings; checking the result)"
count_tables="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
tables=$(query restore_site "$count_tables")
if [ "$tables" -eq 0 ]; then
  # Payload creates its tables on first start-up, which the preview has not had while /admin and
  # /api are closed. An empty copy is only correct if the live database is empty too (read-only).
  live=$(docker compose -f docker-compose.prod.yml exec -T db psql -U ogserc -d ogserc -tAc "$count_tables")
  [ "$live" -eq 0 ] || fail "the copy is empty but the live site database has $live tables"
  echo "--- site database: empty, like the live one (Payload has not created its tables yet)"
else
  migrations=$(query restore_site "SELECT count(*) FROM payload_migrations")
  echo "--- site database: $tables tables, $migrations migrations applied"
  [ "$migrations" -gt 0 ] || fail "the site database has no migrations recorded"
fi

if [ -s "$data/umami.dump" ]; then
  docker exec "$name" createdb -U postgres restore_stats
  docker exec -i "$name" pg_restore -U postgres -d restore_stats --no-owner --no-acl < "$data/umami.dump" ||
    echo "(pg_restore reported warnings; checking the result)"
  views=$(query restore_stats "SELECT count(*) FROM website_event")
  echo "--- statistics database: $views page views"
fi

echo "RESTORE TEST PASSED $(date -u +%FT%TZ)"
