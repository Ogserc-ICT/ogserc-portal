import {
  APIError,
  type CollectionBeforeOperationHook,
  type CollectionBeforeValidateHook,
  type PayloadRequest,
  ValidationError,
} from 'payload'

import { readCommonPasswords } from './common-passwords'
import { passwordProblem } from './password-policy'

// Applies the staff password policy (password-policy.ts) wherever Payload sets a password
// (D-053). There is no option, context flag or overrideAccess exemption to skip it: trusted
// server code obeys it too.

export const BULK_PASSWORD_MESSAGE = 'Set passwords one account at a time.'

export const PASSWORD_CHECK_UNAVAILABLE ='Passwords cannot be checked right now. Try again later, or ask an administrator.'

type Check = {
  password: unknown
  /** Every address the account has or is being given. */
  emails: unknown[]
  collection: string
  req: PayloadRequest
}

type Dependencies = { readList: () => ReadonlySet<string> }

/**
 * Throws a 400 ValidationError on the `password` path if the password breaks the policy. If the
 * common-passwords list cannot be read it refuses (500), never skips: a missing file must not
 * quietly weaken the policy.
 */
export async function enforcePasswordPolicy(
  { password, emails, collection, req }: Check,
  { readList }: Dependencies = { readList: readCommonPasswords },
): Promise<void> {
  let common: ReadonlySet<string>
  try {
    common = readList()
  } catch {
    req.payload.logger.error('Common-passwords list could not be read; password refused (data/common-passwords).')
    throw new APIError(PASSWORD_CHECK_UNAVAILABLE, 500, undefined, true)
  }
  const problem = passwordProblem(password, emails, common)
  if (problem) throw new ValidationError({ collection, errors: [{ message: problem, path: 'password' }] }, req.t)
}

/**
 * beforeValidate on the staff collection: every create (including first-register, which creates
 * through the Local API), and every update that sets a password. An update with an empty password
 * changes nothing in Payload, so it is not checked. On update both the stored and the submitted
 * email are checked: field access may still drop a submitted email change after this hook.
 */
export const passwordPolicyOnSave: CollectionBeforeValidateHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'create' && operation !== 'update') return data
  const password = (data as { password?: unknown } | undefined)?.password
  if (operation === 'update' && !password) return data
  const emails = [(data as { email?: unknown } | undefined)?.email, (originalDoc as { email?: unknown } | undefined)?.email]
  await enforcePasswordPolicy({ password, emails, collection: collection.slug, req })
  return data
}

/**
 * beforeOperation on the staff collection: an update by query (bulk) that sets a password is
 * refused whole (400), before any document changes. One password for many accounts is never
 * legitimate, and it keeps the policy (and the breach check) to one password per operation.
 */
export const refuseBulkPasswordChange: CollectionBeforeOperationHook = ({ args, collection, operation, req }) => {
  if (operation !== 'update') return args
  const { id, data } = args as { id?: unknown; data?: { password?: unknown } }
  if (id === undefined && data?.password) {
    throw new ValidationError({ collection: collection.slug, errors: [{ message: BULK_PASSWORD_MESSAGE, path: 'password' }] }, req.t)
  }
  return args
}

/**
 * beforeOperation on the staff collection, for reset-password (REST and the Local API's
 * resetPassword). Payload runs it with the new password in `args.data`, before it hashes anything
 * (auth/operations/resetPassword.js); its later beforeValidate call comes after the hash is made.
 *
 * The account is found with the same query Payload uses next, in the same transaction. With no
 * valid token this hook does nothing, so Payload's own 403 follows and its reply never depends on
 * the password. A refusal (400) rolls the transaction back, so the token still works for a retry.
 */
export const passwordPolicyOnReset: CollectionBeforeOperationHook = async ({ args, collection, operation, req }) => {
  if (operation !== 'resetPassword') return args
  const data = (args as { data?: { token?: unknown; password?: unknown } }).data
  if (!data || data.token === undefined) return args
  const user = await req.payload.db.findOne<{ id: number | string; email?: unknown }>({
    collection: collection.slug,
    req,
    where: {
      resetPasswordExpiration: { greater_than: new Date().toISOString() },
      resetPasswordToken: { equals: data.token },
    },
  })
  if (!user) return args
  await enforcePasswordPolicy({ password: data.password, emails: [user.email], collection: collection.slug, req })
  return args
}
