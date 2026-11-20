import {
  commitTransaction,
  type Endpoint,
  initTransaction,
  killTransaction,
  type PayloadRequest,
} from 'payload'

import { userCan } from '../../access'
import { recordAudit } from '../audit/record'

// Resetting a staff member's two-factor sign-in, for a lost or replaced phone (Step 3 plan commit 6
// part B, D-084). The plugin has no reset (removing needs the person's own code), and there are no
// recovery codes by the owner's choice. After a reset the person signs in with their password and
// sets up two-factor sign-in again; until then the account has no access.

const TOTP_ATTEMPTS = 'totp-attempts'

export const RESET_MESSAGES = {
  done: 'Two-factor sign-in reset. They set it up again the next time they sign in.',
  own: 'You cannot reset your own two-factor sign-in here. Ask another administrator.',
  notFound: 'No such account.',
  forbidden: 'Only an administrator who has entered their own code can reset two-factor sign-in.',
} as const

type Account = { id: number | string; email?: unknown; totpSecret?: unknown; lockUntil?: unknown }

/**
 * Clears the account's secret and the plugin's wrong-code count, ends every session it has, and
 * unlocks it if it is locked (the plugin locks the account after too many wrong codes, as Payload
 * does after wrong passwords), then records `2fa.reset`: all in the request's transaction, so the
 * change and its audit entries are saved together or not at all. Returns false if there is no such
 * account.
 */
export async function resetTwoFactor(req: PayloadRequest, id: number | string, via: string): Promise<boolean> {
  const { payload } = req
  const account = (await payload.db.findOne({ collection: 'users', where: { id: { equals: id } }, req })) as Account | null
  if (!account) return false
  // The secret through Payload's own update, as the plugin saves it: the adapter's updateOne is an
  // upsert, which Postgres refuses for a partial row (NOT NULL is checked before the conflict).
  await payload.update({ collection: 'users', id: account.id, data: { totpSecret: null }, overrideAccess: true, req, depth: 0 })
  // Sessions live in their own table; the adapter clears them as endSessionsOnRoleChange does.
  await payload.db.updateOne({ collection: 'users', id: account.id, data: { sessions: [] }, req, returning: false })
  await payload.db.deleteMany({ collection: TOTP_ATTEMPTS, where: { id: { equals: String(account.id) } }, req })
  // A person who mistyped codes on a new phone would otherwise stay locked out after the reset.
  // Payload's own unlock, so its audit entry ("Account unlocked") is written as for any unlock.
  if (typeof account.lockUntil === 'string' && Date.parse(account.lockUntil) > Date.now() && typeof account.email === 'string') {
    // Payload types `data` as login data; its unlock operation reads only the email.
    await payload.unlock({ collection: 'users', data: { email: account.email } as { email: string; password: string }, overrideAccess: true, req })
  }
  const actor = req.user?.collection === 'users' ? (req.user as { id: number | string; email?: unknown }) : null
  await recordAudit(req, {
    action: '2fa.reset',
    actor,
    target: { type: 'user', id: account.id, label: account.email },
    details: { via, reason: account.totpSecret ? 'had two-factor sign-in' : 'had not set it up' },
  })
  return true
}

/** Runs `work` in its own transaction on `req`, committing on success and rolling back on any error. */
export async function inTransaction<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  const owns = await initTransaction(req)
  try {
    const result = await work()
    if (owns) await commitTransaction(req)
    return result
  } catch (error) {
    if (owns) await killTransaction(req)
    throw error
  }
}

const reply = (message: string, status: number) => Response.json({ ok: status === 200, message }, { status })

/**
 * `POST /api/users/:id/reset-2fa`. Only an administrator whose own session has entered its code
 * (custom endpoints are not covered by the plugin's access wrapper, so that is checked here), and
 * never on their own account: an administrator who resets their own would lock themselves out.
 */
export const resetTwoFactorEndpoint: Endpoint = {
  path: '/:id/reset-2fa',
  method: 'post',
  handler: async (req) => {
    const user = req.user
    // `_strategy` is "totp" only for a session that has entered its code (the plugin's strategy).
    const verified = (user as { _strategy?: unknown } | null)?._strategy === 'totp'
    if (!user || user.collection !== 'users' || !verified || !userCan(user, 'users:manage')) {
      return reply(RESET_MESSAGES.forbidden, 403)
    }
    const id = req.routeParams?.id
    // Account ids are whole numbers; anything else would reach Postgres as a type error (a 500).
    if (!/^\d+$/.test(String(id ?? ''))) return reply(RESET_MESSAGES.notFound, 404)
    if (String(id) === String(user.id)) return reply(RESET_MESSAGES.own, 400)
    const found = await inTransaction(req, () => resetTwoFactor(req, Number(id), 'admin panel or API'))
    return found ? reply(RESET_MESSAGES.done, 200) : reply(RESET_MESSAGES.notFound, 404)
  },
}
