// Test-only: tries to remove every administrator at once through Payload's Local API, so the
// last-administrator rule can be tested outside REST. Run by tests/e2e-db/support/db-script.ts:
//   pnpm payload run tests/support/last-admin-probe.ts <mode> <caller email>
// Modes:
//   demote-as-user   bulk update roles to ['editor'] where roles include administrator, as <caller>
//                    with access enforced (overrideAccess: false)
//   delete-as-user   bulk delete where roles include administrator, as <caller>, access enforced
//   demote-trusted   the same update as trusted server code (overrideAccess: true, no user)
//   delete-trusted   the same delete as trusted server code
//
// Same safeguards as strip-roles.ts: the guard, DATABASE_URL must be the test database, and the
// live connection must report it. Every administrator in the throwaway test database must be a
// @test.invalid account, or it changes nothing. It reports the outcome and the administrators left
// in E2E_SCRIPT_CONFIRM_FILE, because `payload run` can exit with code 0 without running (D-047).

import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../../src/lib/db/identity'
import { assertWipeableTestDatabase } from './test-db'

const MODES = ['demote-as-user', 'delete-as-user', 'demote-trusted', 'delete-trusted'] as const
type Mode = (typeof MODES)[number]

function fail(message: string): never {
  console.error(`[last-admin-probe] ${message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  const [mode, callerEmail] = process.argv.slice(2) as [Mode | undefined, string | undefined]
  if (!mode || !MODES.includes(mode)) fail(`Pass a mode: ${MODES.join(', ')}.`)
  if (!callerEmail || !callerEmail.endsWith('@test.invalid')) fail('Pass the email of a @test.invalid administrator.')
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

  const administrators = async (): Promise<string[]> => {
    const { docs } = await payload.find({
      collection: 'users',
      where: { roles: { in: ['administrator'] } },
      pagination: false,
      depth: 0,
    })
    return docs.map((doc) => doc.email).sort()
  }
  const before = await administrators()
  if (before.some((email) => !email.endsWith('@test.invalid'))) fail('An administrator is not a test account. Nothing was changed.')

  const where = { roles: { in: ['administrator'] } }
  const asUser = mode.endsWith('-as-user')
  const user = asUser
    ? (await payload.find({ collection: 'users', where: { email: { equals: callerEmail } }, limit: 1, depth: 0 })).docs[0]
    : undefined
  if (asUser && !user) fail(`No account ${callerEmail}.`)
  const access = asUser ? { overrideAccess: false, user: { ...user!, collection: 'users' as const } } : { overrideAccess: true }

  let outcome: { refused: boolean; status?: number; errors?: number }
  try {
    const result = mode.startsWith('demote')
      ? await payload.update({ collection: 'users', where, data: { roles: ['editor'] }, depth: 0, ...access })
      : await payload.delete({ collection: 'users', where, depth: 0, ...access })
    outcome = { refused: false, errors: result.errors.length }
  } catch (error) {
    // The status our rule answers with; never the error's name (D-051).
    const status = (error as { status?: unknown }).status
    outcome = { refused: true, status: typeof status === 'number' ? status : undefined }
  }

  const after = await administrators()
  await writeFile(process.env.E2E_SCRIPT_CONFIRM_FILE, JSON.stringify({ mode, before, after, ...outcome }))
  console.log(`[last-admin-probe] ${mode} in ${describeDatabase(live)}: ${before.length} administrator(s) before, ${after.length} after.`)
  process.exit(0)
}

// Awaited at the top level, so `payload run` does not exit before main() finishes.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Failed.'))
