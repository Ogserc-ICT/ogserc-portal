import type { CollectionConfig, PayloadRequest } from 'payload'

// One reply for every failed staff sign-in (Step 3 plan, D-052). Payload answers an unknown email
// or a wrong password with "The email or password provided is incorrect." but a locked account
// with "This user is locked…", so the message showed that an account exists. Both are 401.

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_MINUTES = 15

export const LOGIN_FAILED_MESSAGE =
  `Sign-in failed. Check your email address and password. ` +
  `After ${MAX_LOGIN_ATTEMPTS} failed attempts an account is locked for ${LOCK_MINUTES} minutes.`

type AfterErrorHook = NonNullable<NonNullable<CollectionConfig['hooks']>['afterError']>[number]

/** True for a POST to this collection's REST login endpoint (the admin panel's sign-in uses it). */
export function isLoginRequest(req: Pick<PayloadRequest, 'method' | 'url'>, apiRoute: string, slug: string): boolean {
  if (req.method !== 'POST' || !req.url) return false
  try {
    return new URL(req.url).pathname === `${apiRoute}/${slug}/login`
  } catch {
    return false
  }
}

/**
 * Replaces the response to any 401 from the login endpoint with the same fixed body. Decided by
 * the endpoint and the status Payload answers with (`error.status`, which its error route uses
 * as the HTTP status), never by the error's class or name: class names are minified in the
 * production build, and an `instanceof` would depend on which bundled copy of Payload threw it
 * (D-051). Other failures (400 for a missing field, 500) keep Payload's response.
 */
export const genericLoginError: AfterErrorHook = ({ collection, error, req }) => {
  const status = (error as { status?: unknown }).status
  if (status !== 401 || !isLoginRequest(req, req.payload.config.routes.api, collection.slug)) return
  return { response: { errors: [{ message: LOGIN_FAILED_MESSAGE }] }, status: 401 }
}
