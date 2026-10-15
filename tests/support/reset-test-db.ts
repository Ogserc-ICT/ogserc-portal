// Empties the end-to-end test database and applies every migration, so tests start from a database
// with the schema and no content. Run by playwright.db.config.ts before it starts the test server:
//   pnpm payload run tests/support/reset-test-db.ts
//
// Safeguards, in order:
// 1. The guard in test-db.ts (not production, the name contains "e2e" or "test", and not the
//    database in PROTECTED_DATABASE_URL, which the harness sets to your normal DATABASE_URL).
// 2. DATABASE_URL, which Payload connects with, must name the same host and database as
//    TEST_DATABASE_URL.
// 3. On the live connection, current_database() and the pool's host must match TEST_DATABASE_URL.
// The reset only drops and recreates the `public` schema inside that one database. It never runs
// DROP DATABASE and never connects to any other database.

import { rm } from 'node:fs/promises'

import { assertWipeableTestDatabase, databaseIdentity, describeDatabase, sameDatabase } from './test-db'

function fail(message: string): never {
  console.error(`[reset-test-db] ${message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  // This process must not write the identity file: the harness reads it to check the server.
  // Any earlier copy is removed so the harness only ever sees what the new server reports.
  if (process.env.E2E_DB_IDENTITY_FILE) await rm(process.env.E2E_DB_IDENTITY_FILE, { force: true })
  delete process.env.E2E_DB_IDENTITY_FILE

  if (!process.env.PROTECTED_DATABASE_URL) {
    fail('PROTECTED_DATABASE_URL is not set, so the guard cannot rule out your normal database.')
  }
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
  if (!sameDatabase(live, target)) {
    fail(`The live connection is ${describeDatabase(live)}, not ${describeDatabase(target)}. Nothing was changed.`)
  }

  console.log(`[reset-test-db] Resetting schema public in ${describeDatabase(live)}`)
  await payload.db.drizzle.execute(sql`drop schema public cascade`)
  await payload.db.drizzle.execute(sql`create schema public`)
  await payload.db.migrate()
  console.log('[reset-test-db] Done: empty database with all migrations applied.')
  process.exit(0)
}

// Awaited at the top level: `payload run` exits with code 0 as soon as this module has loaded, so
// an un-awaited main() would be cut off part-way and still report success.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Reset failed.'))
