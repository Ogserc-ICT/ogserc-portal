// `pnpm auth:reset-2fa <email>`: emergency reset of a staff account's two-factor sign-in, for when
// no administrator can sign in to reset it from the admin panel, for example the last
// administrator lost their phone (docs/RUNBOOK.md Section 4.2, D-084).
//   pnpm auth:reset-2fa --show-target     print only the host and database name; connects to nothing
//   pnpm auth:reset-2fa someone@example   reset that account's two-factor sign-in
// The work is scripts/auth-reset-2fa-payload.ts; it counts only if it confirms itself (confirmed-run.ts).
// The email is passed to it in AUTH_RESET_2FA_EMAIL, never through a shell command line.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { describeDatabase } from '../src/lib/db/identity.ts'
import { parseUnlockArgs } from './auth-unlock.ts'
import { runConfirmedScript } from './confirmed-run.ts'

export const RESET_EMAIL_VARIABLE = 'AUTH_RESET_2FA_EMAIL'

/** The same argument rules as auth:unlock: one plain email address, or --show-target. */
export const parseResetArgs = (args: string[]) => {
  const parsed = parseUnlockArgs(args)
  return 'error' in parsed ? { error: parsed.error.replace('auth:unlock', 'auth:reset-2fa') } : parsed
}

/** "host/db: two-factor sign-in reset", or null unless the file confirms a reset at or after `since`. */
export function readResetConfirmation(file: string, since: Date): string | null {
  try {
    const { host, database, reset, hadTwoFactor, at } = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    if (typeof host !== 'string' || typeof database !== 'string') return null
    if (reset !== true || typeof hadTwoFactor !== 'boolean' || typeof at !== 'string') return null
    const written = Date.parse(at)
    if (Number.isNaN(written) || written < since.getTime()) return null
    const before = hadTwoFactor ? 'it had two-factor sign-in' : 'it had not set it up'
    return `${describeDatabase({ host, database })}: two-factor sign-in reset (${before}; signed out everywhere)`
  } catch {
    return null
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const parsed = parseResetArgs(process.argv.slice(2))
  if ('error' in parsed) {
    console.error(`[auth:reset-2fa] ${parsed.error}`)
    process.exit(1)
  }
  // --show-target stays in process.argv, where runConfirmedScript looks for it.
  const env: Record<string, string> = 'email' in parsed ? { [RESET_EMAIL_VARIABLE]: parsed.email } : {}
  await runConfirmedScript('auth:reset-2fa', 'scripts/auth-reset-2fa-payload.ts', { env, read: readResetConfirmation })
}
