import { APIError, type CollectionConfig, type Where } from 'payload'

import { lockForTransaction } from '../transaction-lock'

// At least one administrator must always remain (Step 3 plan, D-052), or nobody could manage
// accounts again without a developer.
//
// Decided once per operation, before Payload touches any document, over ALL the documents the
// operation targets: Payload processes the documents of a bulk update or delete in parallel within
// one transaction (collections/operations/update.js, delete.js), so a check per document would see
// none of the others' changes. A transaction-scoped advisory lock makes concurrent operations on
// administrators run one after another; each counts only after the previous one has committed.

type BeforeOperationHook = NonNullable<NonNullable<CollectionConfig['hooks']>['beforeOperation']>[number]
type Id = number | string

export const LAST_ADMINISTRATOR_MESSAGE = 'At least one administrator must remain. Make another account an administrator first.'
export const LAST_ADMINISTRATOR_STATUS = 409

const ADMINISTRATOR = 'administrator'

/**
 * Whether removing the administrator role (or the account) from `targets` would leave none.
 * `keeps` is an id the operation cannot actually change even if it matches it: the signed-in
 * caller, whose own role change and own deletion Payload refuses when access is enforced.
 */
export function leavesNoAdministrator({
  administrators,
  targets,
  keeps,
}: {
  administrators: Id[]
  targets: Id[]
  keeps?: Id
}): boolean {
  const removed = new Set(targets.map(String))
  if (keeps !== undefined) removed.delete(String(keeps))
  const losing = administrators.filter((id) => removed.has(String(id)))
  return losing.length > 0 && losing.length === administrators.length
}

/** True if the operation can take the administrator role away: any delete, or an update setting roles without it. */
export function canRemoveAdministrator(operation: string, data: unknown): boolean {
  if (operation === 'delete') return true
  if (operation !== 'update') return false
  const roles = (data as { roles?: unknown } | undefined)?.roles
  return Array.isArray(roles) && !roles.includes(ADMINISTRATOR)
}

/** beforeOperation on the staff collection. Refuses the whole operation (409) if it would leave no administrator. */
export const protectLastAdministrator: BeforeOperationHook = async ({ args, collection, operation, overrideAccess, req }) => {
  if (!canRemoveAdministrator(operation, (args as { data?: unknown }).data)) return args
  await lockForTransaction(req, 'users:administrators')

  const read = { collection: collection.slug, depth: 0, overrideAccess: true, pagination: false, req } as const
  const administrators = await req.payload.find({ ...read, where: { roles: { in: [ADMINISTRATOR] } } })
  const { id, where } = args as { id?: Id; where?: Where }
  // Every document the operation matches, before access narrows it: over-counting is the safe side.
  const targets =
    id !== undefined ? [id] : where ? (await req.payload.find({ ...read, where })).docs.map((doc) => doc.id) : []
  const keeps = !overrideAccess && req.user?.collection === collection.slug ? req.user.id : undefined

  if (leavesNoAdministrator({ administrators: administrators.docs.map((doc) => doc.id), targets, keeps })) {
    throw new APIError(LAST_ADMINISTRATOR_MESSAGE, LAST_ADMINISTRATOR_STATUS, undefined, true)
  }
  return args
}
