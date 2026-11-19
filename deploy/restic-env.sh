# Shared by offsite-backup.sh and test-restore.sh (D-080); sourced, not run.
# Reads the off-server backup settings from .env and defines `restic`, which runs restic from its
# pinned Docker image. The secrets are exported and passed to Docker by name (-e NAME), never as
# values on a command line, so they do not appear in the process list.

RESTIC_IMAGE=restic/restic:0.19.1
# A fixed host name: the container's own changes on every run, and the retention policy groups by it.
OFFSITE_HOST=ogserc-vps

env_value() { sed -n "s/^$1=//p" .env; }
RESTIC_REPOSITORY=$(env_value OFFSITE_REPOSITORY)
RESTIC_PASSWORD=$(env_value OFFSITE_PASSWORD)
AWS_ACCESS_KEY_ID=$(env_value OFFSITE_KEY_ID)
AWS_SECRET_ACCESS_KEY=$(env_value OFFSITE_KEY_SECRET)
if [ -z "$RESTIC_REPOSITORY" ] || [ -z "$RESTIC_PASSWORD" ] || [ -z "$AWS_ACCESS_KEY_ID" ] ||
  [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "Off-server backup settings (OFFSITE_*) are missing from .env: see RUNBOOK Section 6" >&2
  exit 1
fi
export RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
# The region from an endpoint of the form s3.<region>.<provider> (Backblaze, AWS, Wasabi), which some
# S3-compatible providers require to be stated. Left unset for other endpoint shapes.
AWS_DEFAULT_REGION=$(printf '%s' "$RESTIC_REPOSITORY" | sed -n 's#^s3:https://s3\.\([a-z0-9-]*\)\..*#\1#p')
if [ -n "$AWS_DEFAULT_REGION" ]; then export AWS_DEFAULT_REGION; else unset AWS_DEFAULT_REGION; fi

# Optional for one call: RESTIC_MOUNT=host:container adds a folder; RESTIC_USER=uid:gid runs restic
# as that user (without the shared cache, which belongs to root).
restic() {
  if [ -n "${RESTIC_USER:-}" ]; then
    docker run --rm -i --user "$RESTIC_USER" ${RESTIC_MOUNT:+-v "$RESTIC_MOUNT"} \
      -e RESTIC_REPOSITORY -e RESTIC_PASSWORD -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
      -e AWS_DEFAULT_REGION "$RESTIC_IMAGE" --no-cache "$@"
  else
    docker run --rm -i ${RESTIC_MOUNT:+-v "$RESTIC_MOUNT"} \
      -e RESTIC_REPOSITORY -e RESTIC_PASSWORD -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
      -e AWS_DEFAULT_REGION -v ogserc_restic_cache:/root/.cache/restic "$RESTIC_IMAGE" "$@"
  fi
}
