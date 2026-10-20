import { writeFile } from 'node:fs/promises'

import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { migrations } from '../migrations'
import { SchemaIncompleteError } from './boot'
import type { DatabaseIdentity } from './db/identity'
import { verifyDatabaseSchema } from './db/verify-schema'

/**
 * The database this server is really using: the name Postgres reports on the live connection,
 * and the host the connection pool was given. Never includes the user, password or query string.
 */
export async function connectedDatabase(payload: Payload): Promise<DatabaseIdentity> {
  const db = payload.db as unknown as PostgresAdapter
  const result = await db.drizzle.execute(sql`select current_database() as name`)
  const database = String((result.rows[0] as { name?: unknown } | undefined)?.name ?? '')
  let host = ''
  try {
    host = new URL(String(db.poolOptions?.connectionString ?? '')).host.toLowerCase()
  } catch {
    // Pool configured without a connection string: host stays unknown.
  }
  return { host, database }
}

/**
 * Runs once when Payload starts, in every environment: logs which database is in use.
 */
export async function onPayloadInit(payload: Payload): Promise<void> {
  const identity = await connectedDatabase(payload)
  payload.logger.info(`Database: ${identity.database} on ${identity.host || 'unknown host'}`)

  // The end-to-end harness reads this file to confirm the server it is testing uses the test
  // database (tests/e2e-db/global-setup.ts). It holds only the host and database name.
  const identityFile = process.env.E2E_DB_IDENTITY_FILE
  if (identityFile) await writeFile(identityFile, JSON.stringify(identity))
}

/**
 * The production startup check, run at boot once Payload has started and applied prodMigrations
 * (src/instrumentation-node.ts, D-051). Not in onInit: Payload skips onInit when getPayload is
 * retried after a failed start, so a check there could be skipped.
 * - Throws SchemaIncompleteError, after one ERROR line naming only the missing tables and
 *   migrations, unless every expected table and migration record exists.
 * - Warns loudly if there are no users: until the first account exists, whoever opens /admin
 *   first can create an administrator.
 */
export async function checkDatabaseAtStartup(payload: Payload): Promise<void> {
  const problems = await verifyDatabaseSchema(
    payload,
    migrations.map((migration) => migration.name),
  )
  if (problems.length > 0) {
    payload.logger.error(`Database check failed: ${problems.join(' ')}`)
    throw new SchemaIncompleteError()
  }

  const { totalDocs } = await payload.count({ collection: 'users' })
  if (totalDocs === 0) {
    payload.logger.error(
      'SECURITY: there are no user accounts. The first person to open /admin can create an ' +
        'administrator. Create the first administrator now (docs/RUNBOOK.md).',
    )
  }
}
