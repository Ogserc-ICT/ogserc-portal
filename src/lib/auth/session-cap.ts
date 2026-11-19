import { Forbidden, type CollectionConfig } from 'payload'

// A staff session lasts at most 12 hours from sign-in, however active it is (Step 3 plan, D-052).
// Payload has no such limit: its token check looks only for the session id, never its age, and
// every refresh extends the session again. So the refresh itself is refused once the new token
// would outlive the limit; the token already held then simply runs out, before the 12 hours end.

export const SESSION_LIMIT_HOURS = 12

type BeforeOperationHook = NonNullable<NonNullable<CollectionConfig['hooks']>['beforeOperation']>[number]

/**
 * Whether a session that began at `createdAt` may get a new token of `tokenSeconds` at `now`:
 * only if that token would expire before the session limit ends. A missing or unreadable
 * start time is refused.
 */
export function mayRefreshSession(createdAt: unknown, now: Date, tokenSeconds: number, limitHours = SESSION_LIMIT_HOURS): boolean {
  const started = createdAt instanceof Date ? createdAt.getTime() : typeof createdAt === 'string' ? Date.parse(createdAt) : NaN
  if (Number.isNaN(started)) return false
  return now.getTime() + tokenSeconds * 1000 < started + limitHours * 3600 * 1000
}

type StoredSession = { id?: unknown; createdAt?: unknown }

/**
 * beforeOperation on the staff collection: refuses a token refresh past the session limit (403).
 * The session's start time is read from the database in the request's transaction, never from
 * the token or the request.
 */
export const limitSessionAge: BeforeOperationHook = async ({ args, collection, operation, req }) => {
  if (operation !== 'refresh') return args
  const user = req.user as (typeof req.user & { _sid?: unknown }) | null
  // Without a user or a session id Payload refuses the refresh itself.
  if (!user || typeof user._sid !== 'string') return args
  const stored = (await req.payload.db.findOne({
    collection: collection.slug,
    where: { id: { equals: user.id } },
    req,
  })) as { sessions?: StoredSession[] } | null
  const session = stored?.sessions?.find((candidate) => candidate.id === user._sid)
  if (!mayRefreshSession(session?.createdAt, new Date(), collection.auth.tokenExpiration)) {
    throw new Forbidden(req.t)
  }
  return args
}
