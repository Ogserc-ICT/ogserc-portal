#!/usr/bin/env bash
# CI only: a write in db:verify's read-only session must be refused (D-051). Runs the probe, which
# must confirm itself (D-047; one retry), then checks with a normal session that nothing was written.
set -u
fail() { echo "::error::$1"; exit 1; }
confirm=$(mktemp -u)
for attempt in 1 2; do
  rm -f "$confirm"
  READ_ONLY_PROBE_CONFIRM_FILE="$confirm" pnpm payload run scripts/ci/read-only-probe.ts || fail "A write was not refused as read-only (see above)."
  [ -s "$confirm" ] && break
  [ "$attempt" -eq 2 ] && fail "The probe exited with code 0 but did not confirm that it ran (2 attempts)."
  echo "The probe did not confirm that it ran; retrying."
done
export PGPASSWORD=ogserc
table=$(psql -h localhost -U ogserc -d ogserc -tAc "select count(*) from information_schema.tables where table_name = 'read_only_probe'")
row=$(psql -h localhost -U ogserc -d ogserc -tAc "select count(*) from payload_migrations where name = 'read-only-probe'")
db=$(psql -h localhost -U ogserc -d ogserc -tAc "select count(*) from pg_database where datname = 'read_only_probe'")
[ "$table" = 0 ] && [ "$row" = 0 ] && [ "$db" = 0 ] || fail "Something was written: table=$table row=$row database=$db."
echo "Every write was refused and nothing was written."
