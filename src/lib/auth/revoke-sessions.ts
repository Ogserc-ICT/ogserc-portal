import type { CollectionConfig } from 'payload'

// A change of roles ends every session of that account (Step 3 plan, D-052), so the person signs in
// again under the new roles. Payload already ends sessions when a password changes (all others
// when it is your own, all of them when an administrator sets it), but not when roles change.

type AfterChangeHook = NonNullable<NonNullable<CollectionConfig['hooks']>['afterChange']>[number]

function roleSet(roles: unknown): string {
  return Array.isArray(roles) ? [...new Set(roles.map(String))].sort().join('\n') : ''
}

/** True if the two role lists differ as sets (order and duplicates do not count). */
export function rolesChanged(before: unknown, after: unknown): boolean {
  return roleSet(before) !== roleSet(after)
}

/**
 * afterChange on the staff collection. Clears the account's sessions through the database adapter,
 * in the same transaction as the change: Payload's `sessions` field can never be written through
 * the API (its update access is always false), and only this server code may clear it.
 */
export const endSessionsOnRoleChange: AfterChangeHook = async ({ collection, doc, operation, previousDoc, req }) => {
  if (operation !== 'update' || !rolesChanged(previousDoc?.roles, doc?.roles)) return doc
  await req.payload.db.updateOne({
    collection: collection.slug,
    id: doc.id,
    data: { sessions: [] },
    req,
    returning: false,
  })
  return doc
}
