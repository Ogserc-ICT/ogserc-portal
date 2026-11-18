#!/bin/sh
# Nightly GoAccess report from Caddy's visit log (D-079, RUNBOOK Section 8): PDF downloads, crawlers,
# 404s and other errors, suspicious requests and bandwidth over the last 14 days. Run by cron as the
# deploy user:
#   40 2 * * * /opt/ogserc/deploy/log-report.sh >> /var/backups/ogserc/log-report.log 2>&1
# The report holds IP addresses, so it is only on this server; download it to view (RUNBOOK) and
# delete the copy afterwards. It is replaced every night.
set -eu

cd "$(dirname "$0")/.."
out=/var/backups/ogserc/reports
mkdir -p "$out"
chmod 700 "$out"

# The log files belong to root inside the Caddy container, so they are read there and piped out.
docker compose -f docker-compose.prod.yml exec -T caddy sh -c '
  cd /var/log/caddy || exit 1
  for f in access-*.log.gz; do [ -e "$f" ] && zcat "$f"; done
  [ -e access.log ] && cat access.log
  true
' | docker run --rm -i --user "$(id -u):$(id -g)" -v "$out:/out" allinurl/goaccess:1.12 \
  --log-format=CADDY --html-report-title='OGSERC website: server log (last 14 days)' \
  -o /out/report.tmp.html -

mv "$out/report.tmp.html" "$out/report.html"
chmod 600 "$out/report.html"
echo "$(date -u +%FT%TZ) report ok: $out/report.html"
