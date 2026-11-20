import type { PayloadRequest } from 'payload'

import { clientAddress } from '../auth/rate-limit'
import type { AuditAction } from './actions'

// Writes one audit log entry (D-083). Every value written comes from this file's allow-lists, so a
// password, hash, token or reset link can never reach the log, even by a later mistake in a hook.

export type AuditTarget = { type: 'user' | 'media'; id: number | string; label?: unknown }
type Actor = { id: number | string; email?: unknown } | null | undefined

/** Keys a `details` object may have. Anything else is dropped before writing. */
export const DETAIL_KEYS = ['fields', 'from', 'to', 'roles', 'reason', 'via'] as const
type DetailKey = (typeof DETAIL_KEYS)[number]
export type AuditDetails = Partial<Record<DetailKey, string | string[]>>

/** Account fields whose change is recorded, by name only. Secrets and Payload's internals never are. */
export const USER_FIELDS = ['email', 'name', 'roles'] as const
/** Image fields whose change is recorded, by name only. */
export const MEDIA_FIELDS = ['alt', 'filename', 'mimeType', 'filesize'] as const

const MAX_TEXT = 320

/** A short string, or undefined: never an object, never more than 320 characters. */
const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value.slice(0, MAX_TEXT) : typeof value === 'number' ? String(value) : undefined

/** Only allowed keys, and only strings or lists of strings. */
export function safeDetails(details: Record<string, unknown> | undefined): AuditDetails | undefined {
  if (!details) return undefined
  const safe: AuditDetails = {}
  for (const key of DETAIL_KEYS) {
    const value = details[key]
    if (typeof value === 'string') safe[key] = value.slice(0, MAX_TEXT)
    else if (Array.isArray(value)) {
      safe[key] = value.filter((item): item is string => typeof item === 'string').map((item) => item.slice(0, MAX_TEXT))
    }
  }
  return Object.keys(safe).length > 0 ? safe : undefined
}

/** Names of the listed fields whose value differs between the two versions of a document. */
export function changedFields(fields: readonly string[], before: unknown, after: unknown): string[] {
  const read = (doc: unknown, field: string) => JSON.stringify((doc as Record<string, unknown> | undefined)?.[field] ?? null)
  return fields.filter((field) => read(before, field) !== read(after, field))
}

/** The signed-in staff member making the request, if any. */
export function requestActor(req: PayloadRequest): Actor {
  const user = req.user as { id?: number | string; email?: unknown; collection?: string } | null | undefined
  return user?.collection === 'users' && user.id !== undefined ? { id: user.id, email: user.email } : null
}

/** Staff accounts have whole-number ids in Postgres; anything else is not linked to an account. */
const accountId = (id: unknown): number | null => {
  const value = typeof id === 'string' && id.trim() !== '' ? Number(id) : id
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

export type AuditEntry = {
  action: AuditAction
  actor?: Actor
  target?: AuditTarget
  details?: Record<string, unknown>
}

/** The row as written: also used by the unit tests to check what can reach the database. */
export function auditData(req: PayloadRequest, { action, actor, target, details }: AuditEntry) {
  const address = req.headers ? clientAddress(req.headers) : 'unknown'
  return {
    action,
    actor: accountId(actor?.id),
    actorEmail: text(actor?.email) ?? null,
    targetType: target?.type ?? null,
    targetId: target ? String(target.id) : null,
    targetLabel: text(target?.label) ?? null,
    ipAddress: address === 'unknown' ? null : address,
    userAgent: text(req.headers?.get('user-agent')) ?? null,
    details: safeDetails(details) ?? null,
  }
}

/**
 * In the request's transaction (the default): the entry is saved with the change or not at all,
 * and a failure to write it fails the change. `separate: true` writes it on its own, for events
 * whose transaction is rolled back (a refused sign-in); a failure there is logged with fixed text
 * and the reply is not changed.
 */
export async function recordAudit(req: PayloadRequest, entry: AuditEntry, { separate = false } = {}): Promise<void> {
  const write = () =>
    req.payload.create({
      collection: 'audit-log',
      data: auditData(req, entry),
      overrideAccess: true,
      depth: 0,
      ...(separate ? {} : { req }),
    })
  if (!separate) {
    await write()
    return
  }
  try {
    await write()
  } catch {
    req.payload.logger.error(`Audit log: a ${entry.action} entry could not be written.`)
  }
}
