// Test-only, read-only: reports one test account's lock state (`lockUntil`, `loginAttempts`),
// which Payload hides from every API response. Run by tests/e2e-db/support/db-script.ts:
//   pnpm payload run tests/support/read-lock.ts <email>
//
// Same safeguards as strip-roles.ts: the guard, DATABASE_URL must be the test database, and the
// live connection must report it. It reads one @test.invalid account and changes nothing. The
// result is written to E2E_SCRIPT_CONFIRM_FILE, because `payload run` can exit with code 0
// without running the script (D-047).

import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../../src/lib/db/identity'
import { assertWipeableTestDatabase } from './test-db'

function fail(message: string): never {
  console.error(`[read-lock] ${message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  const email = process.argv[2]
  if (!email || !email.endsWith('@test.invalid')) fail('Pass the email of a @test.invalid test account.')
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
  if (!sameDatabase(live, target)) fail(`The live connection is ${describeDatabase(live)}. Nothing was read.`)

  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    showHiddenFields: true,
  })
  const user = docs[0] as { lockUntil?: string | null; loginAttempts?: number | null } | undefined
  if (!user) fail(`No account ${email}.`)

  await writeFile(
    process.env.E2E_SCRIPT_CONFIRM_FILE,
    JSON.stringify({ email, lockUntil: user.lockUntil ?? null, loginAttempts: user.loginAttempts ?? null }),
  )
  console.log(`[read-lock] Read the lock state of ${email} in ${describeDatabase(live)}.`)
  process.exit(0)
}

// Awaited at the top level, so `payload run` does not exit before main() finishes.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Failed.'))
