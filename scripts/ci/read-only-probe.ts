// CI only, in the throwaway Postgres container: proves that the read-only session db:verify uses
// really refuses writes (D-051). Connects exactly as db:verify does (readOnlyConnectionString,
// then Payload), then attempts a CREATE TABLE, an INSERT and a CREATE DATABASE. Each must fail
// with SQLSTATE 25006 (read_only_sql_transaction). Exits 1 if any write succeeds.
//   READ_ONLY_PROBE_CONFIRM_FILE=<file> pnpm payload run scripts/ci/read-only-probe.ts

import { writeFile } from 'node:fs/promises'

import { readOnlyConnectionString } from '../../src/lib/db/read-only'

const READ_ONLY_SQL_TRANSACTION = '25006'

function fail(message: string): never {
  console.error(`[read-only-probe] ${message}`)
  process.exit(1)
}

/** The SQLSTATE of a driver error, which Drizzle may wrap as the cause. */
function sqlState(error: unknown): unknown {
  const value = error as { code?: unknown; cause?: { code?: unknown } } | null
  return value?.code ?? value?.cause?.code
}

async function main(): Promise<void> {
  if (!process.env.CI) fail('Runs in CI only (it attempts writes, which must be refused).')
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set.')
  process.env.DATABASE_URL = readOnlyConnectionString(process.env.DATABASE_URL)

  const [{ getPayload }, { default: config }, { sql }] = await Promise.all([
    import('payload'),
    import('../../src/payload.config'),
    import('@payloadcms/db-postgres'),
  ])
  const payload = await getPayload({ config })
  const db = payload.db as unknown as import('@payloadcms/db-postgres').PostgresAdapter

  const writes = {
    'CREATE TABLE': sql`create table read_only_probe (id integer)`,
    INSERT: sql`insert into payload_migrations (name, batch) values ('read-only-probe', 0)`,
    'CREATE DATABASE': sql`create database read_only_probe`,
  }
  for (const [label, statement] of Object.entries(writes)) {
    const outcome = await db.drizzle.execute(statement).then(
      () => 'succeeded',
      (error: unknown) => sqlState(error),
    )
    if (outcome === 'succeeded') fail(`${label} succeeded in a read-only session.`)
    if (outcome !== READ_ONLY_SQL_TRANSACTION) fail(`${label} failed, but not as read-only (SQLSTATE ${String(outcome)}).`)
    console.log(`[read-only-probe] ${label} refused: read-only transaction (SQLSTATE ${READ_ONLY_SQL_TRANSACTION}).`)
  }
  // `payload run` can exit with code 0 without running this script (D-047).
  if (process.env.READ_ONLY_PROBE_CONFIRM_FILE) await writeFile(process.env.READ_ONLY_PROBE_CONFIRM_FILE, 'refused')
  process.exit(0)
}

await main().catch(() => fail('The probe failed before it could finish (see any error above).'))
