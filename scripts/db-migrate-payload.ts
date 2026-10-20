// The work behind `pnpm migrate` (scripts/db-migrate.ts runs it; do not run it alone):
//   pnpm payload run scripts/db-migrate-payload.ts
//
// Applies every pending migration from the compiled list in src/migrations (the same list the
// server applies as prodMigrations), then checks that every table and migration record exists,
// and only then writes its confirmation. `payload migrate` exited with code 0 in CI without
// applying anything (D-051), so a silent exit must never count as success.

import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../src/lib/db/identity'

function fail(message: string): never {
  console.error(`[migrate] ${message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  const target = databaseIdentity(process.env.DATABASE_URL)
  if (!target) fail('DATABASE_URL is not set or is not a Postgres URL with a database name.')

  const [{ getPayload }, { default: config }, { connectedDatabase }, { migrations }, { verifyDatabaseSchema, expectedSchema }] =
    await Promise.all([
      import('payload'),
      import('../src/payload.config'),
      import('../src/lib/startup'),
      import('../src/migrations'),
      import('../src/lib/db/verify-schema'),
    ])
  const payload = await getPayload({ config })
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`Connected to ${describeDatabase(live)}, not ${describeDatabase(target)}.`)
  console.log(`[migrate] Applying pending migrations to ${describeDatabase(live)}.`)

  // A migration that fails makes Payload log it and exit with code 1. The cast only bridges types:
  // Payload's Migration type takes `unknown` arguments, ours are typed (the same list is passed
  // to the adapter as prodMigrations).
  type Migrations = NonNullable<NonNullable<Parameters<typeof payload.db.migrate>[0]>['migrations']>
  await payload.db.migrate({ migrations: migrations as unknown as Migrations })

  const names = migrations.map((migration) => migration.name)
  const problems = await verifyDatabaseSchema(payload, names)
  if (problems.length > 0) fail(`After migrating, the database is still incomplete:\n- ${problems.join('\n- ')}`)

  const { tables } = expectedSchema(payload, names)
  if (process.env.DB_SCRIPT_CONFIRM_FILE) {
    const confirmation = { ...live, tables: tables.length, migrations: names.length, at: new Date().toISOString() }
    await writeFile(process.env.DB_SCRIPT_CONFIRM_FILE, JSON.stringify(confirmation))
  }
  process.exit(0)
}

// Awaited at the top level: `payload run` exits as soon as this module has loaded (D-047). The
// error itself is not repeated: a driver message can name the database user.
await main().catch(() => fail('Migrating failed before it could finish (see any error above).'))
