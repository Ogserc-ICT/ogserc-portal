#!/usr/bin/env bash
# CI only: a brief database outage at boot must not stop the server (D-051).
#   PG_CONTAINER=<id> bash scripts/ci/expect-startup-after-outage.sh <port>
# Stops the Postgres service container, starts the production build, restarts Postgres once the
# server has reported the outage, then expects the server to start and answer an API request that
# needs the database. Always prints the server's output. The workflow restarts Postgres afterwards
# whatever happens.
set -u
port=$1
log=$(mktemp)
fail() { echo "::error::$1"; exit 1; }

docker stop "$PG_CONTAINER" >/dev/null
node node_modules/next/dist/bin/next start --port "$port" >"$log" 2>&1 &
server=$!

# Restart Postgres only after the server has seen it down, so the test cannot pass without an outage.
saw_outage=0
for _ in $(seq 1 60); do
  if grep -qF 'Database not reachable (attempt 1 of' "$log"; then saw_outage=1; break; fi
  kill -0 "$server" 2>/dev/null || break
  sleep 1
done
docker start "$PG_CONTAINER" >/dev/null

ready=0
for _ in $(seq 1 90); do
  kill -0 "$server" 2>/dev/null || break
  if curl -fsS -o /dev/null "http://localhost:$port/api/users/init"; then ready=1; break; fi
  sleep 1
done
kill "$server" 2>/dev/null
wait "$server" 2>/dev/null

echo "----- server output -----"
cat "$log"
echo "----- end of server output -----"

[ "$saw_outage" -eq 1 ] || fail "The server never reported the outage (expected 'Database not reachable (attempt 1 of')."
[ "$ready" -eq 1 ] || fail "The server did not answer /api/users/init within 90 s of Postgres restarting (it exited, or never became ready)."
grep -qF 'Database reachable; started on attempt' "$log" || fail "The server did not report that it started after the outage."
if grep -qiE 'postgres(ql)?://' "$log"; then fail "A database URL appeared in the server output."; fi
echo "Waited out the outage and started."
