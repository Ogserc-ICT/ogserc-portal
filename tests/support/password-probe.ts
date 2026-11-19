// Test-only: the password policy from trusted server code, through Payload's Local API (D-053).
// Run by tests/e2e-db/support/db-script.ts:
//   pnpm payload run tests/support/password-probe.ts issue-token <email>
//   pnpm payload run tests/support/password-probe.ts bypass <email> <email>
// Modes:
//   issue-token  creates a reset token for one account (forgotPassword, no email sent), so the
//                REST tests can use the reset form's endpoint
//   bypass       as trusted code (overrideAccess: true, no user) tries to set a password that
//                breaks the policy by create, update by id, bulk update and resetPassword, and
//                checks that nothing changed
//
// Same safeguards as strip-roles.ts: the guard, DATABASE_URL must be the test database, and the
// live connection must report it. Only @test.invalid accounts are touched. Results go to
// E2E_SCRIPT_CONFIRM_FILE, because `payload run` can exit with code 0 without running (D-047).
// Nothing here prints a password, hash or token; the token goes only to the confirmation file.

import { randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../../src/lib/db/identity'
import { assertWipeableTestDatabase } from './test-db'

const MODES = ['issue-token', 'bypass'] as const
type Mode = (typeof MODES)[number]

/** How an attempt ended: the HTTP status Payload's error carries, and the policy's message if any. */
type Outcome = { status: number | 'accepted' | 'other error'; message?: string }

function fail(message: string): never {
  console.error(`[password-probe] ${message}`)
  process.exit(1)
}

const random = (bytes: number) => randomBytes(bytes).toString('hex')
/** Always refused by the policy ("ogserc"), whatever the account. */
const weak = () => `ogserc${random(8)}`

async function outcome(attempt: () => Promise<unknown>): Promise<Outcome> {
  try {
    await attempt()
    return { status: 'accepted' }
  } catch (error) {
    // By status and our own message, never by the error's name or class (D-051).
    const { status, data } = error as { status?: unknown; data?: { errors?: { message?: unknown }[] } }
    const message = data?.errors?.[0]?.message
    return {
      status: typeof status === 'number' ? status : 'other error',
      ...(typeof message === 'string' ? { message } : {}),
    }
  }
}

async function main(): Promise<void> {
  const [mode, ...emails] = process.argv.slice(2) as [Mode | undefined, ...string[]]
  if (!mode || !MODES.includes(mode)) fail(`Pass a mode: ${MODES.join(', ')}.`)
  const wanted = mode === 'bypass' ? 2 : 1
  if (emails.length !== wanted || emails.some((email) => !email.endsWith('@test.invalid'))) {
    fail(`Pass ${wanted} @test.invalid email${wanted > 1 ? 's' : ''}.`)
  }
  if (!process.env.PROTECTED_DATABASE_URL) fail('PROTECTED_DATABASE_URL is not set.')
  if (!process.env.E2E_SCRIPT_CONFIRM_FILE) fail('E2E_SCRIPT_CONFIRM_FILE is not set.')
  const target = assertWipeableTestDatabase({ ...process.env, DATABASE_URL: process.env.PROTECTED_DATABASE_URL })
  const connectingTo = databaseIdentity(process.env.DATABASE_URL)
  if (!connectingTo || !sameDatabase(connectingTo, target)) {
    fail(`DATABASE_URL (${describeDatabase(connectingTo)}) is not the test database (${describeDatabase(target)}).`)
  }

  const [{ getPayload }, { default: config }, { connectedDatabase }] = await Promise.all([
    import('payload'),
    import('../../src/payload.config'),
    import('../../src/lib/startup'),
  ])
  const payload = await getPayload({ config })
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`The live connection is ${describeDatabase(live)}. Nothing was changed.`)

  const confirm = (result: object) => writeFile(process.env.E2E_SCRIPT_CONFIRM_FILE!, JSON.stringify(result))
  const issueToken = (email: string) =>
    payload.forgotPassword({ collection: 'users', data: { email }, disableEmail: true })

  if (mode === 'issue-token') {
    const token = await issueToken(emails[0]!)
    if (!token) fail('No reset token was issued.')
    await confirm({ token })
    console.log('[password-probe] Issued a reset token (written to the confirmation file only).')
    process.exit(0)
  }

  // --- bypass ---------------------------------------------------------------------------------
  const secrets = async (email: string) => {
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
      overrideAccess: true,
    })
    const user = docs[0] as { id: number | string; hash?: string; resetPasswordToken?: string | null } | undefined
    if (!user) fail(`No account ${emails[0]}.`)
    return user
  }
  const [first, second] = [emails[0]!, emails[1]!]
  const before = await Promise.all([secrets(first), secrets(second)])

  const newEmail = `pw-probe-${random(4)}@test.invalid`
  const create = await outcome(() =>
    payload.create({
      collection: 'users',
      data: { email: newEmail, name: '[Test] probe', roles: ['editor'], password: weak() },
      overrideAccess: true,
    }),
  )
  const created = (await payload.count({ collection: 'users', where: { email: { equals: newEmail } }, overrideAccess: true }))
    .totalDocs

  const update = await outcome(() =>
    payload.update({ collection: 'users', id: before[0].id, data: { password: weak() }, overrideAccess: true }),
  )

  // A compliant password: bulk password changes are refused whatever the password.
  const bulk = await outcome(() =>
    payload.update({
      collection: 'users',
      where: { email: { in: [first, second] } },
      data: { password: random(16) },
      overrideAccess: true,
    }),
  )

  const token = await issueToken(first)
  const reset = await outcome(() =>
    payload.resetPassword({ collection: 'users', data: { token, password: weak() }, overrideAccess: true }),
  )

  const after = await Promise.all([secrets(first), secrets(second)])
  await confirm({
    create,
    created,
    update,
    bulk,
    reset,
    hashesUnchanged: after.every((user, n) => typeof user.hash === 'string' && user.hash === before[n]!.hash),
    tokenStillIssued: after[0].resetPasswordToken === token,
  })
  console.log('[password-probe] Bypass attempts made; results in the confirmation file.')
  process.exit(0)
}

// Awaited at the top level, so `payload run` does not exit before main() finishes.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Failed.'))
