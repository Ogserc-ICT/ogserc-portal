// The steps of a test-database reset, with the database operations passed in, so the safety
// checks can be unit-tested with a mocked connection (tests/unit/reset-steps.spec.ts). The real
// operations are supplied by reset-test-db.ts.

import { type DatabaseIdentity, describeDatabase, sameDatabase } from './test-db'

export type ResetOperations = {
  /** current_database() on the live connection, and the host the connection uses. */
  liveDatabase: () => Promise<DatabaseIdentity>
  /** Drops and recreates the public schema in the connected database. */
  resetSchema: () => Promise<void>
  migrate: () => Promise<void>
  /** Table names in the public schema. */
  existingTables: () => Promise<string[]>
  /** Names recorded in payload_migrations. */
  appliedMigrations: () => Promise<string[]>
}

/** What a successful reset must leave behind. */
export type ExpectedSchema = { tables: string[]; migrations: string[] }

/** Problems with the database after a reset; empty when it is as expected. */
export function checkResetResult(expected: ExpectedSchema, tables: string[], migrations: string[]): string[] {
  const problems: string[] = []
  const missingTables = expected.tables.filter((name) => !tables.includes(name))
  const missingMigrations = expected.migrations.filter((name) => !migrations.includes(name))
  if (expected.tables.length === 0) problems.push('No expected tables were given.')
  if (missingTables.length > 0) problems.push(`Missing tables: ${missingTables.join(', ')}.`)
  if (missingMigrations.length > 0) problems.push(`Migrations not recorded: ${missingMigrations.join(', ')}.`)
  return problems
}

/**
 * Resets the test database, refusing before any change unless the live connection is the target,
 * and failing afterwards unless every expected table and migration record exists.
 */
export async function resetAndVerify(
  target: DatabaseIdentity,
  operations: ResetOperations,
  expected: ExpectedSchema,
  log: (message: string) => void = console.log,
): Promise<void> {
  const live = await operations.liveDatabase()
  if (!sameDatabase(live, target)) {
    throw new Error(`The live connection is ${describeDatabase(live)}, not ${describeDatabase(target)}. Nothing was changed.`)
  }

  log(`Resetting schema public in ${describeDatabase(live)}`)
  await operations.resetSchema()
  await operations.migrate()

  const problems = checkResetResult(expected, await operations.existingTables(), await operations.appliedMigrations())
  if (problems.length > 0) throw new Error(`The reset did not produce the expected database:\n- ${problems.join('\n- ')}`)
  log(`Verified: ${expected.tables.length} tables and ${expected.migrations.length} migrations present.`)
}
