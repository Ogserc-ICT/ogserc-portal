#!/bin/sh
# Disk-space check (D-079, RUNBOOK Section 8). Run by cron as the deploy user every 30 minutes:
#   */30 * * * * /opt/ogserc/deploy/check-disk.sh > /dev/null 2>&1
# Pings Healthchecks.io with the usage of each watched filesystem: a normal ping while all are below
# LIMIT, a /fail ping when one reaches it. Healthchecks.io alerts on a fail, and also when pings stop
# arriving (server down, or cron not running), so no output needs to be kept here.
set -eu

LIMIT=80
cd "$(dirname "$0")/.."
url=$(sed -n 's/^HC_DISK_PING_URL=//p' .env)
if [ -z "$url" ]; then
  echo "HC_DISK_PING_URL is missing from .env" >&2
  exit 1
fi

# The system disk, Docker's images and volumes (database, logs) and the backups.
# Percentage first, so a folder name with spaces cannot shift the columns.
usage=$(df --output=pcent,target / /var/lib/docker /var/backups/ogserc 2>/dev/null | awk 'NR > 1' | sort -u)
worst=$(printf '%s\n' "$usage" | awk '{ sub("%", "", $1); if ($1 + 0 > max) max = $1 + 0 } END { print max + 0 }')

suffix=
if [ "$worst" -ge "$LIMIT" ]; then
  suffix=/fail
fi
curl -fsS -m 10 --retry 3 --data-raw "$usage" "$url$suffix" > /dev/null
echo "disk ${worst}% (limit ${LIMIT}%)${suffix:+: ALERT sent}"
