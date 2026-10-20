// Checks that a database has every table and migration record the code expects. Used after a
// test-database reset (tests/support/reset-steps.ts) and by db:verify (scripts/db-verify.ts).
// Messages hold only table and migration names.

import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/** What a complete database must contain. */
export type ExpectedSchema = { tables: string[]; migrations: string[] }

/** Problems with the database; empty when it has everything expected. */
export function checkSchema(expected: ExpectedSchema, tables: string[], migrations: string[]): string[] {
  const problems: string[] = []
  const missingTables = expected.tables.filter((name) => !tables.includes(name))
  const missingMigrations = expected.migrations.filter((name) => !migrations.includes(name))
  if (expected.tables.length === 0) problems.push('No expected tables were given.')
  if (missingTables.length > 0) problems.push(`Missing tables: ${missingTables.join(', ')}.`)
  if (missingMigrations.length > 0) problems.push(`Migrations not recorded: ${missingMigrations.join(', ')}.`)
  return problems
}

/** Every table the running config defines, and every migration name given. */
export function expectedSchema(payload: Payload, migrationNames: string[]): ExpectedSchema {
  const db = payload.db as unknown as PostgresAdapter
  return { tables: Object.keys(db.tables), migrations: migrationNames }
}

/**
 * Reads the tables in the public schema and the recorded migrations (read-only queries), and
 * returns what is missing. Extra tables and extra migration records are not problems.
 */
export async function verifyDatabaseSchema(payload: Payload, migrationNames: string[]): Promise<string[]> {
  const db = payload.db as unknown as PostgresAdapter
  const names = async (query: ReturnType<typeof sql>): Promise<string[]> =>
    (await db.drizzle.execute(query)).rows.map((row) => String((row as { name: unknown }).name))

  const tables = await names(sql`select table_name as name from information_schema.tables where table_schema = 'public'`)
  // Without the migrations table nothing is recorded; checkSchema then lists every migration.
  const migrations = tables.includes('payload_migrations') ? await names(sql`select name from payload_migrations`) : []
  return checkSchema(expectedSchema(payload, migrationNames), tables, migrations)
}
