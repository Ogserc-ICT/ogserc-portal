// Runs a `payload run` script that must confirm itself, for `pnpm migrate`, `pnpm db:verify` and
// `pnpm auth:unlock`.
// `payload run` (and `payload migrate`) can exit with code 0 without running anything (D-047,
// D-051), so success counts only if the script wrote a fresh confirmation file to
// DB_SCRIPT_CONFIRM_FILE: host, database, table and migration counts, and the time. One retry; the
// scripts are idempotent. Messages name the host and database only.
//
// Run with Node's type stripping, which cannot resolve extensionless imports: hence `.ts` below.

import { spawn } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { databaseIdentity, describeDatabase } from '../src/lib/db/identity.ts'

/** What the script confirmed, or null unless the file is complete and written at or after `since`. */
export function readConfirmation(file: string, since: Date): string | null {
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

function run(command: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true, stdio: 'inherit', env })
    child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
  })
}

/** A reader of the confirmation file: a one-line summary, or null if it does not confirm the run. */
export type ConfirmationReader = (file: string, since: Date) => string | null

export type ConfirmedScriptOptions = {
  /** Added to the script's environment only (e.g. its input, so it never passes through a shell). */
  env?: Record<string, string>
  /** Defaults to readConfirmation (tables and migrations). */
  read?: ConfirmationReader
}

/**
 * Loads .env (if any), checks DATABASE_URL, and either prints the target (`--show-target`,
 * connecting to nothing) or runs `script` until it confirms itself. Exits non-zero on failure.
 * The retry is safe only for idempotent scripts.
 */
export async function runConfirmedScript(label: string, script: string, options: ConfirmedScriptOptions = {}): Promise<void> {
  const read = options.read ?? readConfirmation
  const fail = (message: string): never => {
    console.error(`[${label}] ${message}`)
    process.exit(1)
  }
  try {
    process.loadEnvFile()
  } catch {
    // No .env file: use the environment as it is (CI, or variables set by hand).
  }
  const target = databaseIdentity(process.env.DATABASE_URL)
  if (!target) fail('DATABASE_URL is not set or is not a Postgres URL with a database name.')
  if (process.argv.includes('--show-target')) {
    console.log(`[${label}] Target: ${describeDatabase(target)}. Nothing was connected to.`)
    return
  }

  const confirmFile = path.join(os.tmpdir(), `ogserc-${label.replace(/\W/g, '-')}-${process.pid}.json`)
  const env = { ...process.env, ...options.env, DB_SCRIPT_CONFIRM_FILE: confirmFile }
  for (let attempt = 1; attempt <= 2; attempt++) {
    rmSync(confirmFile, { force: true })
    const started = new Date()
    const code = await run(`pnpm payload run ${script}`, env)
    const confirmed = read(confirmFile, started)
    rmSync(confirmFile, { force: true })
    if (code !== 0) fail(`Failed (exit code ${code}).`)
    if (confirmed) {
      console.log(`[${label}] Confirmed: ${confirmed}.`)
      return
    }
    const message = `Exited with code 0 but did not confirm that it ran (attempt ${attempt} of 2).`
    if (attempt === 2) fail(`${message} Nothing can be assumed about the database; see D-047.`)
    console.error(`[${label}] ${message} Retrying.`)
  }
}
