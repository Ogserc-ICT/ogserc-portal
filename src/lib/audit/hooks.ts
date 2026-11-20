import type { CollectionConfig, PayloadRequest } from 'payload'

import { isLoginRequest } from '../auth/generic-login-error'
import { changedFields, MEDIA_FIELDS, recordAudit, requestActor, USER_FIELDS } from './record'

// The hooks that write the audit log (D-083). Staff account events go on the Users collection,
// image events on Media; Step 4's content collections reuse contentAuditHooks.

type Hooks = NonNullable<CollectionConfig['hooks']>
type Hook<K extends keyof Hooks> = NonNullable<Hooks[K]>[number]

type UserDoc = { id: number | string; email?: unknown; roles?: unknown }
type LockState = UserDoc & { lockUntil?: string | null }

const userTarget = (user: UserDoc) => ({ type: 'user' as const, id: user.id, label: user.email })
const roles = (doc: unknown) => {
  const value = (doc as { roles?: unknown } | undefined)?.roles
  return Array.isArray(value) ? value.filter((role): role is string => typeof role === 'string') : []
}
const emailOf = (data: unknown) => {
  const email = (data as { email?: unknown } | undefined)?.email
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined
}

/** The staff account with this email, read on its own (outside any transaction), with its lock. */
async function findAccount(req: PayloadRequest, email: string | undefined, inTransaction = false) {
  if (!email) return undefined
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    showHiddenFields: true,
    overrideAccess: true,
    ...(inTransaction ? { req } : {}),
  })
  return docs[0] as LockState | undefined
}

/** A sign-in through the login endpoint. A reset link also signs in, but is recorded as a reset. */
export const auditLogin: Hook<'afterLogin'> = async ({ req, user }) => {
  if (!isLoginRequest(req, req.payload.config.routes.api, 'users')) return
  const account = user as UserDoc
  await recordAudit(req, { action: 'login.succeeded', actor: account, target: userTarget(account) })
}

export const auditLogout: Hook<'afterLogout'> = async ({ req }) => {
  const actor = requestActor(req)
  await recordAudit(req, { action: 'logout', actor, target: actor ? { type: 'user', id: actor.id, label: actor.email } : undefined })
}

/** Payload runs this only for an email that belongs to an account; unknown emails leave no entry. */
export const auditForgotPassword: Hook<'afterForgotPassword'> = async ({ args }) => {
  const req = (args as { req?: PayloadRequest } | undefined)?.req
  if (!req) return
  const account = await findAccount(req, emailOf((args as { data?: unknown }).data), true)
  if (account) await recordAudit(req, { action: 'password.reset-requested', actor: requestActor(req), target: userTarget(account) })
}

/** A finished reset (the account is in the result) and an unlock (by an administrator or server code). */
export const auditAuthOperations: Hook<'afterOperation'> = async ({ args, operation, req, result }) => {
  if (operation === 'resetPassword') {
    const user = (result as { user?: UserDoc } | undefined)?.user
    if (user) await recordAudit(req, { action: 'password.reset-completed', actor: user, target: userTarget(user) })
  } else if (operation === 'unlock') {
    const account = await findAccount(req, emailOf((args as { data?: unknown }).data), true)
    if (account) {
      const via = req.payloadAPI === 'local' ? 'server code (for example pnpm auth:unlock)' : 'admin panel or API'
      await recordAudit(req, { action: 'account.unlocked', actor: requestActor(req), target: userTarget(account), details: { via } })
    }
  }
  return result
}

const PASSWORD_SET = 'auditPasswordSet'

/**
 * beforeValidate: notes that an update sets a password. Payload hashes it and removes it from the
 * data before afterChange runs, so afterChange cannot see it. One account per request: a bulk
 * password change is refused (refuseBulkPasswordChange).
 */
export const notePasswordChange: Hook<'beforeValidate'> = ({ data, operation, req }) => {
  if (operation === 'update' && (data as { password?: unknown } | undefined)?.password) req.context[PASSWORD_SET] = true
  return data
}

/**
 * Account created, changed or given a new password, with field names only. Saves that change no
 * listed field (Payload storing a reset token or a session, for example) leave no entry.
 */
export const auditUserChange: Hook<'afterChange'> = async ({ doc, operation, previousDoc, req }) => {
  const actor = requestActor(req)
  const target = userTarget(doc as UserDoc)
  if (operation === 'create') {
    await recordAudit(req, { action: 'user.created', actor, target, details: { roles: roles(doc) } })
    return doc
  }
  const fields = changedFields(USER_FIELDS, previousDoc, doc)
  if (fields.includes('roles')) {
    await recordAudit(req, { action: 'user.roles-changed', actor, target, details: { from: roles(previousDoc), to: roles(doc) } })
  }
  const others = fields.filter((field) => field !== 'roles')
  if (others.length > 0) await recordAudit(req, { action: 'user.updated', actor, target, details: { fields: others } })
  if (req.context?.[PASSWORD_SET] === true) {
    delete req.context[PASSWORD_SET]
    const self = actor !== null && actor !== undefined && String(actor.id) === String(target.id)
    await recordAudit(req, { action: 'password.changed', actor, target, details: { via: self ? 'own account' : 'set by another account' } })
  }
  return doc
}

export const auditUserDelete: Hook<'afterDelete'> = async ({ doc, req }) => {
  await recordAudit(req, { action: 'user.deleted', actor: requestActor(req), target: userTarget(doc as UserDoc) })
  return doc
}

const LOCKED_BEFORE = 'auditLockedBeforeLogin'

const isLocked = (account: LockState | undefined) => Boolean(account?.lockUntil && Date.parse(account.lockUntil) > Date.now())

/**
 * beforeOperation for sign-in, after the rate limits: notes whether the account was already locked
 * before this attempt, so a refusal can tell "this attempt locked it" from "it was locked". One
 * read per sign-in, outside any transaction (Payload opens one only after the password is right).
 */
export const noteLockBeforeLogin: Hook<'beforeOperation'> = async ({ args, operation, req }) => {
  if (operation !== 'login' || !isLoginRequest(req, req.payload.config.routes.api, 'users')) return args
  try {
    req.context[LOCKED_BEFORE] = isLocked(await findAccount(req, emailOf((args as { data?: unknown }).data)))
  } catch {
    req.payload.logger.error('Audit log: the account for a sign-in could not be read.')
  }
  return args
}

/**
 * A refused sign-in. Its transaction is rolled back, so the entry is written on its own. The email
 * typed is stored only if it belongs to an account: people sometimes type a password there.
 * Listed after the rate-limit hooks and before genericLoginError, which replaces the reply.
 */
export const auditFailedLogin: Hook<'afterError'> = async ({ collection, error, req }) => {
  const status = (error as { status?: unknown }).status
  if ((status !== 401 && status !== 429) || !isLoginRequest(req, req.payload.config.routes.api, collection.slug)) return
  let account: LockState | undefined
  try {
    account = await findAccount(req, emailOf(req.data))
  } catch {
    req.payload.logger.error('Audit log: the account for a refused sign-in could not be read.')
  }
  const target = account ? userTarget(account) : undefined
  if (status === 429) {
    await recordAudit(req, { action: 'login.limited', target, details: account ? undefined : { reason: 'unknown account' } }, { separate: true })
    return
  }
  const lockedBefore = req.context?.[LOCKED_BEFORE] === true
  const reason = !account ? 'unknown account' : lockedBefore ? 'account locked' : 'wrong password'
  await recordAudit(req, { action: 'login.failed', target, details: { reason } }, { separate: true })
  if (account && !lockedBefore && isLocked(account)) await recordAudit(req, { action: 'account.locked', target }, { separate: true })
}

/** For content collections (Media now, Step 4's collections later): created, changed, deleted. */
export function contentAuditHooks(type: 'media', fields: readonly string[] = MEDIA_FIELDS) {
  const label = (doc: unknown) => (doc as { filename?: unknown; title?: unknown } | undefined)?.filename ?? (doc as { title?: unknown })?.title
  const afterChange: Hook<'afterChange'> = async ({ doc, operation, previousDoc, req }) => {
    const target = { type, id: (doc as { id: number | string }).id, label: label(doc) }
    if (operation === 'create') {
      await recordAudit(req, { action: `${type}.created`, actor: requestActor(req), target })
    } else {
      const changed = changedFields(fields, previousDoc, doc)
      if (changed.length > 0) await recordAudit(req, { action: `${type}.updated`, actor: requestActor(req), target, details: { fields: changed } })
    }
    return doc
  }
  const afterDelete: Hook<'afterDelete'> = async ({ doc, req }) => {
    await recordAudit(req, { action: `${type}.deleted`, actor: requestActor(req), target: { type, id: (doc as { id: number | string }).id, label: label(doc) } })
    return doc
  }
  return { afterChange, afterDelete }
}
