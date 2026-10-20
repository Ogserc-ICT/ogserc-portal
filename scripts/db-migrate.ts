// `pnpm migrate`: applies pending migrations to the database in DATABASE_URL, then confirms that
// every table and migration record is there (D-051, docs/RUNBOOK.md Section 3).
//   pnpm migrate                  apply and confirm
//   pnpm migrate --show-target    print only the host and database name; connects to nothing
// The work is scripts/db-migrate-payload.ts; it counts only if it confirms itself (confirmed-run.ts).
// Payload's own command is still available as `pnpm payload migrate`, without that protection.

import { pathToFileURL } from 'node:url'

import { runConfirmedScript } from './confirmed-run.ts'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runConfirmedScript('migrate', 'scripts/db-migrate-payload.ts')
}
