// Test-only: removes every role from one test account, so tests can check that an account with no
// roles is refused everywhere. The API cannot do this (roles are required), so it is done in the
// database. Run by tests/e2e-db/support/db-script.ts:
//   pnpm payload run tests/support/strip-roles.ts <email>
//
// Same safeguards as reset-test-db.ts: the guard, DATABASE_URL must be the test database, and the
// live connection must report it. It changes only rows of one @test.invalid account, through a
// parameterised query. Success is confirmed in E2E_SCRIPT_CONFIRM_FILE, because `payload run` can
// exit with code 0 without running the script (D-047).

import { writeFile } from 'node:fs/promises'

import { assertWipeableTestDatabase, databaseIdentity, describeDatabase, sameDatabase } from './test-db'

function fail(message: string): never {
  console.error(`[strip-roles] ${message}`)
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

  const [{ getPayload }, { default: config }, { sql }, { connectedDatabase }] = await Promise.all([
    import('payload'),
    import('../../src/payload.config'),
    import('@payloadcms/db-postgres'),
    import('../../src/lib/startup'),
  ])
  const payload = await getPayload({ config })
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`The live connection is ${describeDatabase(live)}. Nothing was changed.`)

  const { docs } = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })
  const user = docs[0]
  if (!user) fail(`No account ${email}.`)
  const db = payload.db as unknown as import('@payloadcms/db-postgres').PostgresAdapter
  await db.drizzle.execute(sql`delete from users_roles where parent_id = ${user.id}`)
  const after = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
  if ((after.roles ?? []).length !== 0) fail(`Roles are still present for ${email}.`)

  await writeFile(process.env.E2E_SCRIPT_CONFIRM_FILE, JSON.stringify({ email, roles: [] }))
  console.log(`[strip-roles] Removed every role from ${email} in ${describeDatabase(live)}.`)
  process.exit(0)
}

// Awaited at the top level, so `payload run` does not exit before main() finishes.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Failed.'))
