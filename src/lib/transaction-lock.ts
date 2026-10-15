import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

/**
 * Makes concurrent requests that check-then-write the same thing run one after another. Takes a
 * Postgres advisory lock inside the request's transaction; it is released when that transaction
 * commits or rolls back. Statements after it see everything committed before the lock was granted.
 *
 * Throws if the request has no transaction, because a lock outside one would be released at once.
 */
export async function lockForTransaction(req: PayloadRequest, name: string): Promise<void> {
  const db = req.payload.db as unknown as PostgresAdapter
  const transactionID = await req.transactionID
  const session = transactionID === undefined ? undefined : db.sessions[transactionID]
  if (!session) throw new Error(`lockForTransaction(${name}) needs a database transaction.`)
  await session.db.execute(sql`select pg_advisory_xact_lock(hashtext(${name}))`)
}
