// `pnpm db:verify`: checks, read-only, that the database in DATABASE_URL has every table the code
// defines and a record of every migration in src/migrations (D-051, docs/RUNBOOK.md Section 3).
//   pnpm db:verify                  run the check
//   pnpm db:verify --show-target    print only the host and database name; connects to nothing
//
// The check itself is scripts/db-verify-payload.ts, run through `payload run`. That can exit with
// code 0 without running the script (D-047), so success counts only if the script wrote a fresh
// confirmation file. Without one it retries once, then fails.
//
// Run with Node's type stripping, which cannot resolve extensionless imports: hence `.ts` below.

import { spawn } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { databaseIdentity, describeDatabase } from '../src/lib/db/identity.ts'

/** What the check confirmed, or null unless the file is complete and written at or after `since`. */
export function verifyConfirmation(file: string, since: Date): string | null {
  try {
    const { host, database, tables, migrations, at } = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    if (typeof host !== 'string' || typeof database !== 'string') return null
    if (typeof tables !== 'number' || typeof migrations !== 'number' || typeof at !== 'string') return null
    const written = Date.parse(at)
    if (Number.isNaN(written) || written < since.getTime()) return null
    return `${describeDatabase({ host, database })}: ${tables} tables and ${migrations} migrations present`
  } catch {
    return null
  }
}

function fail(message: string): never {
  console.error(`[db:verify] ${message}`)
  process.exit(1)
}

function run(command: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true, stdio: 'inherit', env })
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })
}

async function main(): Promise<void> {
  try {
    process.loadEnvFile()
  } catch {
    // No .env file: use the environment as it is (CI, or variables set by hand).
  }
  const target = databaseIdentity(process.env.DATABASE_URL)
  if (!target) fail('DATABASE_URL is not set or is not a Postgres URL with a database name.')
  if (process.argv.includes('--show-target')) {
    console.log(`[db:verify] Target: ${describeDatabase(target)}. Nothing was connected to.`)
    return
  }

  const confirmFile = path.join(os.tmpdir(), `ogserc-db-verify-${process.pid}.json`)
  const env = { ...process.env, DB_VERIFY_CONFIRM_FILE: confirmFile }
  for (let attempt = 1; attempt <= 2; attempt++) {
    rmSync(confirmFile, { force: true })
    const started = new Date()
    const code = await run('pnpm payload run scripts/db-verify-payload.ts', env)
    const confirmed = verifyConfirmation(confirmFile, started)
    rmSync(confirmFile, { force: true })
    if (code !== 0) fail(`The check failed (exit code ${code}).`)
    if (confirmed) {
      console.log(`[db:verify] Confirmed: ${confirmed}.`)
      return
    }
    const message = `The check exited with code 0 but did not confirm that it ran (attempt ${attempt} of 2).`
    if (attempt === 2) fail(message)
    console.error(`[db:verify] ${message} Retrying.`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
