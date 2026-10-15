import { writeFile } from 'node:fs/promises'

import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

export type DatabaseIdentity = { host: string; database: string }

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
 * Runs once when Payload starts. Logs which database is in use and, in production, warns loudly
 * if there are no users: until the first account exists, whoever opens /admin first can create
 * an administrator.
 */
export async function onPayloadInit(payload: Payload): Promise<void> {
  const identity = await connectedDatabase(payload)
  payload.logger.info(`Database: ${identity.database} on ${identity.host || 'unknown host'}`)

  // The end-to-end harness reads this file to confirm the server it is testing uses the test
  // database (tests/e2e-db/global-setup.ts). It holds only the host and database name.
  const identityFile = process.env.E2E_DB_IDENTITY_FILE
  if (identityFile) await writeFile(identityFile, JSON.stringify(identity))

  if (process.env.NODE_ENV === 'production') {
    // A database without tables yet (before the first migration) also counts as no users.
    const totalDocs = await payload
      .count({ collection: 'users' })
      .then((result) => result.totalDocs)
      .catch(() => 0)
    if (totalDocs === 0) {
      payload.logger.error(
        'SECURITY: there are no user accounts. The first person to open /admin can create an ' +
          'administrator. Create the first administrator now (docs/RUNBOOK.md).',
      )
    }
  }
}
