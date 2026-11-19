#!/bin/sh
# Creates Umami's database and database user inside the existing PostgreSQL container (D-077,
# RUNBOOK Section 5, step I). Safe to run again: it only creates what is missing and resets the
# password to the value in .env. Run as the deploy user from anywhere:
#   /opt/ogserc/deploy/create-analytics-db.sh
# The password is read from .env and sent to psql on standard input, so it never appears on the
# screen or in the process list.
set -eu

cd "$(dirname "$0")/.."
pw=$(sed -n 's/^UMAMI_DB_PASSWORD=//p' .env)
if [ -z "$pw" ]; then
  echo "UMAMI_DB_PASSWORD is missing from .env" >&2
  exit 1
fi

{
  # The password is hex (openssl rand -hex 32), so it never contains a quote.
  printf '%s\n' "\\set pw '$pw'"
  cat <<'SQL'
SELECT 'CREATE ROLE umami LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'umami')\gexec
ALTER ROLE umami WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'pw';
SELECT 'CREATE DATABASE umami OWNER umami' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'umami')\gexec
-- Each database is reachable only by its owner: Umami cannot connect to the site's database.
REVOKE ALL ON DATABASE ogserc FROM PUBLIC;
REVOKE ALL ON DATABASE umami FROM PUBLIC;
SQL
} | docker compose -f docker-compose.prod.yml exec -T db psql -U ogserc -d postgres -q -v ON_ERROR_STOP=1

echo "analytics database ready"
