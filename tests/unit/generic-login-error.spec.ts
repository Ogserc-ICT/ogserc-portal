import { expect, test } from '@playwright/test'
import { AuthenticationError, LockedAuth, type PayloadRequest, type SanitizedCollectionConfig } from 'payload'

import {
  genericLoginError,
  isLoginRequest,
  LOCK_MINUTES,
  LOGIN_FAILED_MESSAGE,
  MAX_LOGIN_ATTEMPTS,
} from '../../src/lib/auth/generic-login-error'

// The rewrite is decided by the endpoint and the status only (D-051: no error names or classes).
// The database tests check the real replies (tests/e2e-db/users.spec.ts, "failed sign-ins").

const users = { slug: 'users' } as SanitizedCollectionConfig

function requestTo(method: string, url: string): PayloadRequest {
  return { method, url, payload: { config: { routes: { api: '/api' } } } } as unknown as PayloadRequest
}

function run(error: Error, req: PayloadRequest) {
  return genericLoginError({ collection: users, context: {}, error, req, result: undefined } as never)
}

/** An error of no Payload class at all, carrying only a status, like any error Payload's route answers. */
function plainError(status: number): Error {
  return Object.assign(new Error('anything'), { status })
}

const GENERIC = { response: { errors: [{ message: LOGIN_FAILED_MESSAGE }] }, status: 401 }

test('the message states the real limits', () => {
  expect(LOGIN_FAILED_MESSAGE).toContain(`${MAX_LOGIN_ATTEMPTS} failed attempts`)
  expect(LOGIN_FAILED_MESSAGE).toContain(`${LOCK_MINUTES} minutes`)
})

test('a 401 from the login endpoint gets the generic reply, whatever the error is', async () => {
  const login = requestTo('POST', 'http://localhost:3000/api/users/login?depth=0')
  for (const error of [new LockedAuth(), new AuthenticationError(), plainError(401)]) {
    expect(await run(error, login)).toEqual(GENERIC)
  }
})

test('other statuses from the login endpoint keep their own reply', async () => {
  const login = requestTo('POST', 'http://localhost:3000/api/users/login')
  for (const status of [400, 403, 429, 500]) {
    expect(await run(plainError(status), login), String(status)).toBeUndefined()
  }
  expect(await run(new Error('no status'), login)).toBeUndefined()
})

test('a 401 anywhere else keeps its own reply', async () => {
  for (const [method, url] of [
    ['GET', 'http://localhost:3000/api/users/login'],
    ['POST', 'http://localhost:3000/api/users/me'],
    ['POST', 'http://localhost:3000/api/users/login/extra'],
    ['POST', 'http://localhost:3000/api/media/login'],
    ['POST', 'http://localhost:3000/admin/users/login'],
  ] as const) {
    expect(await run(plainError(401), requestTo(method, url)), `${method} ${url}`).toBeUndefined()
  }
})

test('isLoginRequest refuses a missing or malformed URL', () => {
  expect(isLoginRequest({ method: 'POST', url: undefined }, '/api', 'users')).toBe(false)
  expect(isLoginRequest({ method: 'POST', url: 'not a url' }, '/api', 'users')).toBe(false)
})
