// `pnpm auth:unlock <email>`: emergency unlock of a staff account that was locked after too many
// failed sign-ins, for when no administrator can sign in to unlock it (docs/RUNBOOK.md Section 4.1).
//   pnpm auth:unlock --show-target     print only the host and database name; connects to nothing
//   pnpm auth:unlock someone@example   unlock that account
// The work is scripts/auth-unlock-payload.ts; it counts only if it confirms itself (confirmed-run.ts).
// The email is passed to it in AUTH_UNLOCK_EMAIL, never through a shell command line.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { describeDatabase } from '../src/lib/db/identity.ts'
import { runConfirmedScript } from './confirmed-run.ts'

export const UNLOCK_EMAIL_VARIABLE = 'AUTH_UNLOCK_EMAIL'

// A plain address: no spaces, quotes or shell characters, one @, a dot in the domain.
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

export type UnlockArgs = { showTarget: true } | { email: string } | { error: string }

export function parseUnlockArgs(args: string[]): UnlockArgs {
  if (args.includes('--show-target')) return { showTarget: true }
  const values = args.filter((arg) => arg !== '--')
  if (values.length !== 1) return { error: 'Pass exactly one email address: pnpm auth:unlock someone@example.org' }
  const email = values[0]!.trim().toLowerCase()
  if (email.length > 254 || !EMAIL.test(email)) return { error: 'That is not a plain email address.' }
  return { email }
}

/** "host/db: account unlocked", or null unless the file confirms an unlock at or after `since`. */
export function readUnlockConfirmation(file: string, since: Date): string | null {
  try {
    const { host, database, unlocked, wasLocked, at } = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    if (typeof host !== 'string' || typeof database !== 'string') return null
    if (unlocked !== true || typeof wasLocked !== 'boolean' || typeof at !== 'string') return null
    const written = Date.parse(at)
    if (Number.isNaN(written) || written < since.getTime()) return null
    const before = wasLocked ? 'it was locked' : 'it was not locked'
    return `${describeDatabase({ host, database })}: account unlocked (${before}; failed attempts reset to 0)`
  } catch {
    return null
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const parsed = parseUnlockArgs(process.argv.slice(2))
  if ('error' in parsed) {
    console.error(`[auth:unlock] ${parsed.error}`)
    process.exit(1)
  }
  // --show-target stays in process.argv, where runConfirmedScript looks for it.
  const env: Record<string, string> = 'email' in parsed ? { [UNLOCK_EMAIL_VARIABLE]: parsed.email } : {}
  await runConfirmedScript('auth:unlock', 'scripts/auth-unlock-payload.ts', { env, read: readUnlockConfirmation })
}
