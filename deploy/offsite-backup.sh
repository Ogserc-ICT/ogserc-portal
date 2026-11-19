#!/bin/sh
# Encrypted off-server copy of the nightly backup (D-080, RUNBOOK Section 6): restic, from its pinned
# Docker image, to S3-compatible storage (Backblaze B2). Everything is encrypted on this server before
# upload. backup-db.sh runs it after each backup once OFFSITE_REPOSITORY is in .env, so the
# Healthchecks.io backup check covers it. By hand, as the deploy user:
#   deploy/offsite-backup.sh init        create the encrypted repository (once)
#   deploy/offsite-backup.sh             copy the latest backup now, then apply the retention policy
#   deploy/offsite-backup.sh snapshots   list the copies held off the server
#   deploy/offsite-backup.sh check       verify the repository
# What is copied: the latest site and statistics dumps, and .env (without its secrets a restored
# database cannot be used). Kept: 7 daily, 4 weekly and 3 monthly copies (owner, 2026-11-18).
set -eu

cd "$(dirname "$0")/.."
. ./deploy/restic-env.sh

case "${1:-backup}" in
  init) restic init; exit ;;
  snapshots) restic snapshots --host "$OFFSITE_HOST"; exit ;;
  check) restic check; exit ;;
  backup) ;;
  *) echo "usage: $0 [init|snapshots|check]" >&2; exit 2 ;;
esac

dir=/var/backups/ogserc
stage=$dir/offsite
# Dump names carry a UTC timestamp, so the last in name order is the newest.
latest() { ls -1 "$dir"/"$1"-*.dump 2>/dev/null | tail -n 1; }
site=$(latest ogserc)
stats=$(latest umami)
if [ -z "$site" ]; then
  echo "No site database dump in $dir" >&2
  exit 1
fi

# Fixed names, so every copy covers the same paths and the retention policy can compare them.
mkdir -p "$stage"
chmod 700 "$stage"
ln -f "$site" "$stage/ogserc.dump"
if [ -n "$stats" ]; then ln -f "$stats" "$stage/umami.dump"; fi
cp .env "$stage/env"
chmod 600 "$stage/env"

RESTIC_MOUNT="$stage:/data:ro" restic backup --host "$OFFSITE_HOST" --tag nightly /data
restic forget --host "$OFFSITE_HOST" --keep-daily 7 --keep-weekly 4 --keep-monthly 3 --prune
echo "$(date -u +%FT%TZ) offsite ok"
