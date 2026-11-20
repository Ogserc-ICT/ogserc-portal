import { APIError, type CollectionBeforeOperationHook, type CollectionConfig } from 'payload'

// Without email (D-085) a "forgot password" request could never reach the person, so it is refused:
// an administrator sets a new temporary password instead (docs/RUNBOOK.md Section 4.3). The reply is
// the same for every email, known or not, so it never shows whether an account exists. Trusted
// server code (the Local API) may still issue reset tokens; nothing over the API can.

export const FORGOT_PASSWORD_OFF =
  'Password resets by email are switched off. Ask an administrator to set a new password for you.'

/** Marks an error whose message is meant for the visitor, for publicErrorReply. */
const PUBLIC_REPLY = 'ogsercPublicReply'

function publicError(message: string, status: number) {
  return Object.assign(new APIError(message, status, undefined, true), { [PUBLIC_REPLY]: true })
}

/** beforeOperation on the staff collection, listed first: a refused request does no other work. */
export const refuseForgotPassword: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'forgotPassword' || req.payloadAPI !== 'REST') return args
  throw publicError(FORGOT_PASSWORD_OFF, 403)
}

type AfterErrorHook = NonNullable<NonNullable<CollectionConfig['hooks']>['afterError']>[number]

/**
 * afterError: writes the reply for an error made by publicError. Payload's formatter recognises its
 * error classes by `instanceof` and by name, which the production build minifies (D-051, D-081).
 */
export const publicErrorReply: AfterErrorHook = ({ error }) => {
  const marked = error as { [PUBLIC_REPLY]?: unknown; status?: unknown; message?: unknown }
  if (marked[PUBLIC_REPLY] !== true || typeof marked.status !== 'number' || typeof marked.message !== 'string') return
  return { response: { errors: [{ message: marked.message }] }, status: marked.status }
}
