// Reusable access functions for Payload collections (NFR-SEC-02). Payload runs these on the
// server for every REST, GraphQL and Local API request made with access enforced, so they are
// the single place where permissions are decided. Anything not explicitly allowed is denied
// (see deny-by-default.ts).

import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

import { type Capability, hasCapability } from './roles'

const STAFF_COLLECTION = 'users'

type RequestUser = PayloadRequest['user']

/** A signed-in member of OGSERC staff. Users of any future public auth collection never are. */
export function isStaffUser(user: RequestUser): boolean {
  return user?.collection === STAFF_COLLECTION && hasCapability(user, 'admin:access')
}

/** True if the signed-in staff user holds the capability. */
export function userCan(user: RequestUser, capability: Capability): boolean {
  return isStaffUser(user) && hasCapability(user, capability)
}

// Boolean-only (not `Access`) so they also fit Payload's `admin` and `unlock` access slots.
export const denyAll = (): boolean => false

export const allowAll = (): boolean => true

/** Access function for any capability, e.g. `read: can('audit:read')`. */
export const can =
  (capability: Capability): Access =>
  ({ req }) =>
    userCan(req.user, capability)

export const isStaff = ({ req }: { req: PayloadRequest }): boolean => isStaffUser(req.user)

export const isAdmin = ({ req }: { req: PayloadRequest }): boolean => userCan(req.user, 'users:manage')

export const isPublisherOrAbove: Access = can('content:publish')

export const isEditorOrAbove: Access = can('content:edit')

/** Staff see everything; everyone else sees only published documents (drafts-enabled collections). */
export const publishedOnly: Access = ({ req }) => {
  if (isStaffUser(req.user)) return true
  const published: Where = { _status: { equals: 'published' } }
  return published
}

/** Administrators see every user; other staff only their own account. */
export const isAdminOrSelf: Access = ({ req }) => {
  if (userCan(req.user, 'users:manage')) return true
  if (!isStaffUser(req.user) || !req.user) return false
  const self: Where = { id: { equals: req.user.id } }
  return self
}

/**
 * Create/update access for drafts-enabled content: editors may save drafts, but only
 * publishers and administrators may save a published version.
 */
export const canSaveContent: Access = ({ req, data }) => {
  if (userCan(req.user, 'content:publish')) return true
  if (!userCan(req.user, 'content:edit')) return false
  return data?._status !== 'published'
}

/** Field-level version of `can`, e.g. for fields only administrators may set. */
export const fieldCan =
  (capability: Capability): FieldAccess =>
  ({ req }) =>
    userCan(req.user, capability)

/**
 * For custom endpoints, which Payload's collection access does not cover. Returns a generic
 * 403 response to send back, or null when the request may proceed.
 */
export function requireCapability(req: PayloadRequest, capability: Capability): Response | null {
  if (userCan(req.user, capability)) return null
  return Response.json({ errors: [{ message: 'You are not allowed to perform this action.' }] }, { status: 403 })
}
