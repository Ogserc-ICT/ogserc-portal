// `pnpm db:verify`: checks, read-only, that the database in DATABASE_URL has every table the code
// defines and a record of every migration in src/migrations (D-051, docs/RUNBOOK.md Section 3).
//   pnpm db:verify                  run the check
//   pnpm db:verify --show-target    print only the host and database name; connects to nothing
// The check is scripts/db-verify-payload.ts; it counts only if it confirms itself (confirmed-run.ts).

import { pathToFileURL } from 'node:url'

import { runConfirmedScript } from './confirmed-run.ts'

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runConfirmedScript('db:verify', 'scripts/db-verify-payload.ts')
}
