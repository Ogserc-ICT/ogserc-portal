#!/usr/bin/env bash
# CI only: starts the production build and expects it to refuse to start (D-051).
#   bash scripts/ci/expect-startup-refusal.sh <time limit, seconds> <port> <expected text>...
# Always prints the server's output. Fails if the server is still running at the time limit,
# exits 0, does not print every expected text, or prints a database URL.
set -u
limit=$1 port=$2
shift 2
log=$(mktemp)
fail() { echo "::error::$1"; exit 1; }

# next itself, not a pnpm wrapper, so the time limit stops the server process.
timeout --kill-after=10s "$limit" node node_modules/next/dist/bin/next start --port "$port" >"$log" 2>&1
code=$?
echo "----- server output -----"
cat "$log"
echo "----- end of server output (exit code $code) -----"

if [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; then fail "The server did not exit within ${limit}s; it should have refused to start."; fi
if [ "$code" -eq 0 ]; then fail "The server exited with code 0; it should have refused to start."; fi
for text in "$@"; do
  grep -qF -- "$text" "$log" || fail "Expected \"$text\" in the server output."
done
if grep -qiE 'postgres(ql)?://' "$log"; then fail "A database URL appeared in the server output."; fi
echo "Refused to start as expected (exit code $code)."
