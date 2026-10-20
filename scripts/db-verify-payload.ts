// The database check behind `pnpm db:verify` (scripts/db-verify.ts runs it; do not run it alone):
//   pnpm payload run scripts/db-verify-payload.ts
//
// Read-only, so it may be pointed at production from a full checkout of the deployed commit:
// - It refuses NODE_ENV=production, in which Payload would apply pending migrations on connect.
// - Its sessions are read-only (default_transaction_read_only), so Postgres refuses any write,
//   including the CREATE DATABASE Payload attempts if the database does not exist. It checks that
//   the live session really is read-only before anything else, and stops if not.
// It prints only the host and database name, then the missing tables and migrations, if any.

import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../src/lib/db/identity'
import { readOnlyConnectionString } from '../src/lib/db/read-only'

function fail(message: string): never {
  console.error(`[db:verify] ${message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    fail('Refusing to run with NODE_ENV=production: Payload would apply pending migrations. Unset it and run again.')
  }
  const target = databaseIdentity(process.env.DATABASE_URL)
  if (!target) fail('DATABASE_URL is not set or is not a Postgres URL with a database name.')
  // Before the config is imported: it reads DATABASE_URL when it loads.
  process.env.DATABASE_URL = readOnlyConnectionString(process.env.DATABASE_URL!)

  const [{ getPayload }, { default: config }, { sql }, { connectedDatabase }, { migrations }, { verifyDatabaseSchema, expectedSchema }] =
    await Promise.all([
      import('payload'),
      import('../src/payload.config'),
      import('@payloadcms/db-postgres'),
      import('../src/lib/startup'),
      import('../src/migrations'),
      import('../src/lib/db/verify-schema'),
    ])
  const payload = await getPayload({ config })
  const db = payload.db as unknown as import('@payloadcms/db-postgres').PostgresAdapter

  const readOnly = (await db.drizzle.execute(sql`show transaction_read_only`)).rows[0] as { transaction_read_only?: unknown }
  if (readOnly?.transaction_read_only !== 'on') {
    fail('The session is not read-only (the server ignored the options parameter). Nothing was checked.')
  }
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`Connected to ${describeDatabase(live)}, not ${describeDatabase(target)}.`)
  console.log(`[db:verify] Checking ${describeDatabase(live)} (read-only session).`)

  const names = migrations.map((migration) => migration.name)
  const problems = await verifyDatabaseSchema(payload, names)
  if (problems.length > 0) fail(`The database is incomplete:\n- ${problems.join('\n- ')}`)

  const { tables } = expectedSchema(payload, names)
  console.log(`[db:verify] Verified: ${tables.length} tables and ${names.length} migrations present.`)
  // `payload run` can exit with code 0 without running this script (D-047), so the wrapper counts
  // success only from this file.
  if (process.env.DB_SCRIPT_CONFIRM_FILE) {
    const confirmation = { ...live, tables: tables.length, migrations: names.length, at: new Date().toISOString() }
    await writeFile(process.env.DB_SCRIPT_CONFIRM_FILE, JSON.stringify(confirmation))
  }
  process.exit(0)
}

// Awaited at the top level: `payload run` exits as soon as this module has loaded (D-047).
// The error itself is not repeated: a driver message can name the database user, and Payload has
// already logged connection errors.
await main().catch(() => fail('The check failed before it could finish (see any error above). Nothing was changed.'))
