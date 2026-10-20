// Test-only: makes one test account's sessions look older, so tests can check the 12-hour
// absolute session limit without waiting 12 hours. Run by tests/e2e-db/support/db-script.ts:
//   pnpm payload run tests/support/age-session.ts <email> <hours>
//
// Same safeguards as strip-roles.ts: the guard, DATABASE_URL must be the test database, and the
// live connection must report it. It changes only `users_sessions.created_at` for one
// @test.invalid account, through a parameterised query, and reads the result back. Success is
// confirmed in E2E_SCRIPT_CONFIRM_FILE, because `payload run` can exit with code 0 without running
// the script (D-047).

import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../../src/lib/db/identity'
import { assertWipeableTestDatabase } from './test-db'

function fail(message: string): never {
  console.error(`[age-session] ${message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  const [email, hoursArg] = process.argv.slice(2)
  if (!email || !email.endsWith('@test.invalid')) fail('Pass the email of a @test.invalid test account.')
  const hours = Number(hoursArg)
  if (!Number.isFinite(hours) || hours < 0 || hours > 48) fail('Pass the age in hours, 0 to 48.')
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
  const createdAt = new Date(Date.now() - hours * 3600 * 1000)
  const db = payload.db as unknown as import('@payloadcms/db-postgres').PostgresAdapter
  await db.drizzle.execute(sql`update users_sessions set created_at = ${createdAt.toISOString()} where _parent_id = ${user.id}`)
  const result = await db.drizzle.execute(sql`select created_at from users_sessions where _parent_id = ${user.id}`)
  const rows = result.rows as { created_at: string | Date }[]
  if (rows.length === 0) fail(`${email} has no session to age.`)
  if (rows.some((row) => Math.abs(new Date(row.created_at).getTime() - createdAt.getTime()) > 1000)) {
    fail(`The sessions of ${email} were not changed.`)
  }

  await writeFile(process.env.E2E_SCRIPT_CONFIRM_FILE, JSON.stringify({ email, sessions: rows.length, createdAt }))
  console.log(`[age-session] ${rows.length} session(s) of ${email} now started ${hours} h ago, in ${describeDatabase(live)}.`)
  process.exit(0)
}

// Awaited at the top level, so `payload run` does not exit before main() finishes.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Failed.'))
