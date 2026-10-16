// Empties the end-to-end test database and applies every migration, so tests start from a database
// with the schema and no content. Run by playwright.db.config.ts before it starts the test server:
//   pnpm payload run tests/support/reset-test-db.ts
//
// Safeguards, in order:
// 1. The guard in test-db.ts (not production, the name contains "e2e" or "test", and not the
//    database in PROTECTED_DATABASE_URL, which the harness sets to your normal DATABASE_URL).
// 2. DATABASE_URL, which Payload connects with, must name the same host and database as
//    TEST_DATABASE_URL.
// 3. On the live connection, current_database() and the pool's host must match TEST_DATABASE_URL
//    (reset-steps.ts).
// The reset only drops and recreates the `public` schema inside that one database. It never runs
// DROP DATABASE and never connects to any other database. Afterwards it checks that every table in
// the current schema and every migration record exists and that there are no users, and exits
// non-zero if not.

import { rm, writeFile } from 'node:fs/promises'

import { resetAndVerify } from './reset-steps'
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
  console.log('[reset-test-db] Started.')

  if (!process.env.PROTECTED_DATABASE_URL) {
    fail('PROTECTED_DATABASE_URL is not set, so the guard cannot rule out your normal database.')
  }
  const target = assertWipeableTestDatabase({ ...process.env, DATABASE_URL: process.env.PROTECTED_DATABASE_URL })

  const connectingTo = databaseIdentity(process.env.DATABASE_URL)
  if (!connectingTo || !sameDatabase(connectingTo, target)) {
    fail(`DATABASE_URL (${describeDatabase(connectingTo)}) is not the test database (${describeDatabase(target)}).`)
  }

  const [{ getPayload }, { default: config }, { sql }, { connectedDatabase }, { migrations }] = await Promise.all([
    import('payload'),
    import('../../src/payload.config'),
    import('@payloadcms/db-postgres'),
    import('../../src/lib/startup'),
    import('../../src/migrations'),
  ])
  const payload = await getPayload({ config })
  const db = payload.db as unknown as import('@payloadcms/db-postgres').PostgresAdapter
  const rows = async (query: ReturnType<typeof sql>): Promise<string[]> =>
    (await db.drizzle.execute(query)).rows.map((row) => String((row as { name: unknown }).name))

  await resetAndVerify(
    target,
    {
      liveDatabase: () => connectedDatabase(payload),
      resetSchema: async () => {
        await db.drizzle.execute(sql`drop schema public cascade`)
        await db.drizzle.execute(sql`create schema public`)
      },
      migrate: () => payload.db.migrate(),
      existingTables: () =>
        rows(sql`select table_name as name from information_schema.tables where table_schema = 'public'`),
      appliedMigrations: () => rows(sql`select name from payload_migrations`),
      userCount: async () => Number((await rows(sql`select count(*)::text as name from users`))[0]),
    },
    // Every table Payload's current config defines, and every migration in src/migrations.
    { tables: Object.keys(db.tables), migrations: migrations.map((migration) => migration.name) },
    (message) => console.log(`[reset-test-db] ${message}`),
  )
  // `payload run` can exit with code 0 without having run this script at all (seen on Windows:
  // its TypeScript loader stalls and Node exits as if finished). So success is confirmed in a
  // file the harness checks, never by the exit code alone (test-server.ts, D-047).
  if (process.env.E2E_RESET_CONFIRM_FILE) {
    await writeFile(process.env.E2E_RESET_CONFIRM_FILE, JSON.stringify({ ...target, users: 0, at: new Date().toISOString() }))
  }
  process.exit(0)
}

// Awaited at the top level: `payload run` exits with code 0 as soon as this module has loaded, so
// an un-awaited main() would be cut off part-way and still report success.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Reset failed.'))
