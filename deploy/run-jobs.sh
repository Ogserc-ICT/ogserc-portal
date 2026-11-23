#!/bin/sh
# Scheduled publishing (D-090, RUNBOOK Section 6): asks the app to carry out any publish or unpublish
# that staff scheduled and that is now due. Run by cron as the deploy user every 5 minutes:
#   */5 * * * * /opt/ogserc/deploy/run-jobs.sh >> /var/backups/ogserc/run-jobs.log 2>&1
# The request is made inside the app container, to the app itself, with JOBS_RUN_SECRET from the
# container's environment, so the secret never appears in the server's process list or in a log.
# It prints nothing when all is well, and one line with the time when the app refuses or cannot be
# reached, so the log only grows when something needs looking at.
set -eu

cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml exec -T app node -e '
const secret = process.env.JOBS_RUN_SECRET
const stamp = () => new Date().toISOString()
if (!secret) {
  console.error(stamp() + " JOBS_RUN_SECRET is not set in .env")
  process.exit(1)
}
fetch("http://localhost:3000/api/payload-jobs/run?limit=20", {
  headers: { Authorization: "Bearer " + secret },
  signal: AbortSignal.timeout(120000),
})
  .then((response) => {
    if (!response.ok) {
      console.error(stamp() + " the job runner answered " + response.status)
      process.exit(1)
    }
  })
  .catch(() => {
    console.error(stamp() + " the job runner could not be reached")
    process.exit(1)
  })
'
