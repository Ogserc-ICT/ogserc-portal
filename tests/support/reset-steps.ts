// The steps of a test-database reset, with the database operations passed in, so the safety
// checks can be unit-tested with a mocked connection (tests/unit/reset-steps.spec.ts). The real
// operations are supplied by reset-test-db.ts.

import { type DatabaseIdentity, describeDatabase, sameDatabase } from '../../src/lib/db/identity'
import { checkSchema, type ExpectedSchema } from '../../src/lib/db/verify-schema'

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
  /** Rows in the users table. */
  userCount: () => Promise<number>
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

  const problems = checkSchema(expected, await operations.existingTables(), await operations.appliedMigrations())
  if (problems.length > 0) throw new Error(`The reset did not produce the expected database:\n- ${problems.join('\n- ')}`)

  // Tests rely on starting with no accounts (the first-user test creates the administrator).
  const users = await operations.userCount()
  if (users !== 0) {
    throw new Error(
      `The users table has ${users} row(s) straight after the reset; it must be empty. Something wrote ` +
        'to the test database during the reset, for example an earlier test server that is still running.',
    )
  }
  log(`Verified: ${expected.tables.length} tables and ${expected.migrations.length} migrations present; no users.`)
}
