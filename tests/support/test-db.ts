// Guard for tests that wipe a database. Every wipe goes through assertWipeableTestDatabase, which
// refuses unless TEST_DATABASE_URL clearly names a separate test database. It reports only the host
// and database name, never the user, password or query string.
//
// Run alone to see which database the tests would use, without touching it:
//   node --experimental-strip-types tests/support/test-db.ts

import { pathToFileURL } from 'node:url'

// With the .ts extension, so Node's type stripping can resolve it when this file is run directly.
import { type DatabaseIdentity, databaseIdentity, describeDatabase, sameDatabase } from '../../src/lib/db/identity.ts'

export type Env = Record<string, string | undefined>

const TEST_NAME_MARKERS = ['e2e', 'test']

/** Reasons the test database must not be wiped; empty when it is safe. */
export function checkTestDatabase(env: Env): { identity: DatabaseIdentity | null; errors: string[] } {
  const errors: string[] = []
  if (env.NODE_ENV === 'production') errors.push('NODE_ENV is production.')

  const identity = databaseIdentity(env.TEST_DATABASE_URL)
  if (!env.TEST_DATABASE_URL) errors.push('TEST_DATABASE_URL is not set.')
  else if (!identity) errors.push('TEST_DATABASE_URL is not a valid Postgres URL with a database name.')

  if (identity) {
    const name = identity.database.toLowerCase()
    if (!TEST_NAME_MARKERS.some((marker) => name.includes(marker))) {
      errors.push(`The database name must contain "${TEST_NAME_MARKERS.join('" or "')}".`)
    }
    const main = databaseIdentity(env.DATABASE_URL)
    if (main && sameDatabase(identity, main)) {
      errors.push('TEST_DATABASE_URL points at the same host and database as DATABASE_URL.')
    }
  }
  return { identity, errors }
}

/** Throws unless the test database may be wiped. Returns its identity for logging. */
export function assertWipeableTestDatabase(env: Env): DatabaseIdentity {
  const { identity, errors } = checkTestDatabase(env)
  if (errors.length > 0 || !identity) {
    throw new Error(`Refusing to wipe the test database (${describeDatabase(identity)}):\n- ${errors.join('\n- ')}`)
  }
  return identity
}

function main(): void {
  try {
    process.loadEnvFile()
  } catch {
    // No .env file: use the environment as it is (CI).
  }
  try {
    const identity = assertWipeableTestDatabase(process.env)
    console.log(`Test database passes the guard: ${describeDatabase(identity)}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Refusing to wipe the test database.')
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
