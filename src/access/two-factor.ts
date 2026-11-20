import type { Access } from 'payload'
import { totpAccess } from 'payload-totp'

// The two-factor plugin wraps every access function so that a staff session without a verified
// code gets nothing (D-084). Its wrapper also refuses visitors who are not signed in, which would
// close public reads. These keep the public part of a read open and the staff part behind 2FA.

/** Put on a collection whose read is public to everyone, staff or not (`custom` in its config). */
export const PUBLIC_READ = { totp: { disableAccessWrapper: { read: true } } } as const

/**
 * For a read that differs between the public and staff (for example `publishedOnly`): a visitor
 * who is not signed in gets `access` as it is; a signed-in user goes through the 2FA check first.
 * Use it together with PUBLIC_READ, so the plugin does not wrap it a second time.
 */
export function publicOrTwoFactor(access: Access): Access & { inner: Access } {
  const forStaff = totpAccess(access)
  const wrapped: Access = (args) => (args.req.user ? forStaff(args) : access(args))
  // The rule as written, so the access audit can still recognise it (tests/unit/config-access.spec.ts).
  return Object.assign(wrapped, { inner: access })
}
