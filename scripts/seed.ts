// `pnpm seed`: adds clearly marked sample content of every type to a review or development
// database, so every page can be reviewed (FR-CMS-08, D-094; docs/RUNBOOK.md Section 3).
//   pnpm seed --show-target          print only the host and database name; connects to nothing
//   pnpm seed --database <name>      add the samples to that database, if it is the one shown
// The work is scripts/seed-payload.ts; it counts only if it confirms itself (confirmed-run.ts).
// Never for the live site: it refuses production mode and any database staff have worked in.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { describeDatabase } from '../src/lib/db/identity.ts'
import { runConfirmedScript } from './confirmed-run.ts'

export const SEED_DATABASE_VARIABLE = 'SEED_DATABASE'

export type SeedArgs = { showTarget: true } | { database: string } | { error: string }

const NAME = /^[A-Za-z0-9_-]{1,63}$/

export function parseSeedArgs(args: string[]): SeedArgs {
  if (args.includes('--show-target')) return { showTarget: true }
  const values = args.filter((arg) => arg !== '--')
  const at = values.indexOf('--database')
  const name = at >= 0 ? values[at + 1] : undefined
  if (values.length !== 2 || !name) {
    return { error: 'First run pnpm seed --show-target, then pnpm seed --database <the database name it shows>.' }
  }
  if (!NAME.test(name)) return { error: 'That is not a database name.' }
  return { database: name }
}

/** "host/db: N added, M already there", or null unless the file confirms a seed at or after `since`. */
export function readSeedConfirmation(file: string, since: Date): string | null {
  try {
    const { host, database, created, skipped, at } = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    if (typeof host !== 'string' || typeof database !== 'string') return null
    if (typeof created !== 'number' || typeof skipped !== 'number' || typeof at !== 'string') return null
    const written = Date.parse(at)
    if (Number.isNaN(written) || written < since.getTime()) return null
    return `${describeDatabase({ host, database })}: ${created} sample items added, ${skipped} already there`
  } catch {
    return null
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const parsed = parseSeedArgs(process.argv.slice(2))
  if ('error' in parsed) {
    console.error(`[seed] ${parsed.error}`)
    process.exit(1)
  }
  const env: Record<string, string> = 'database' in parsed ? { [SEED_DATABASE_VARIABLE]: parsed.database } : {}
  await runConfirmedScript('seed', 'scripts/seed-payload.ts', { env, read: readSeedConfirmation })
}
