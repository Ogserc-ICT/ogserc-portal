import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

import { type APIRequestContext, expect, request } from '@playwright/test'

// Shared sign-in helpers for database-backed tests. Every test signs in through these, so when
// two-factor authentication changes what signing in involves, only this file changes.

export type TestAccount = { email: string; password: string; name: string }

/** A new account with a random password and an address that can never receive mail. */
export function newAccount(label: string): TestAccount {
  const id = randomBytes(4).toString('hex')
  return {
    email: `${label}-${id}@test.invalid`,
    password: randomBytes(24).toString('base64url'),
    name: `[Test] ${label}`,
  }
}

/** Request headers that act as the signed-in user. */
export function asUser(token: string): Record<string, string> {
  return { Authorization: `JWT ${token}` }
}

/** Name of Payload's session cookie (default cookie prefix "payload"). */
export const SESSION_COOKIE = 'payload-token'

/**
 * The session cookie from a response's Set-Cookie headers: its value and its attributes as
 * written (e.g. "HttpOnly=true", "SameSite=Strict"). Undefined if the response sets none.
 */
export function sessionCookie(
  headers: { name: string; value: string }[],
): { value: string; attributes: string[] } | undefined {
  for (const { name, value } of headers) {
    if (name.toLowerCase() !== 'set-cookie') continue
    const [pair, ...attributes] = value.split(';').map((part) => part.trim())
    if (!pair?.startsWith(`${SESSION_COOKIE}=`)) continue
    return { value: pair.slice(SESSION_COOKIE.length + 1), attributes }
  }
  return undefined
}

/**
 * One login attempt; returns the status, the response body and, on success, the session token.
 * The token comes from the session cookie: the server never puts it in a response body
 * (`removeTokenFromResponses`).
 */
export async function attemptLogin(
  baseURL: string,
  email: string,
  password: string,
): Promise<{ status: number; body: string; token?: string }> {
  const anonymous = await request.newContext({ baseURL })
  try {
    const response = await anonymous.post('/api/users/login', { data: { email, password } })
    const token = response.ok() ? sessionCookie(response.headersArray())?.value : undefined
    return { status: response.status(), body: await response.text(), token }
  } finally {
    await anonymous.dispose()
  }
}

/** Signs in and returns the session token, failing the test if sign-in is refused. */
export async function signInToken(baseURL: string, account: TestAccount): Promise<string> {
  const { status, token } = await attemptLogin(baseURL, account.email, account.password)
  expect(token, `sign-in failed for ${account.email} (${status})`).toBeTruthy()
  return token!
}

/**
 * Signs in and returns a request context that acts as that user and nobody else. Each context
 * has its own cookie jar, so tests can hold several users at once without mixing them up.
 */
export async function signIn(baseURL: string, account: TestAccount): Promise<APIRequestContext> {
  const token = await signInToken(baseURL, account)
  return request.newContext({ baseURL, extraHTTPHeaders: asUser(token) })
}

/** Creates a staff account with the given roles, as an administrator. */
export async function createStaff(admin: APIRequestContext, label: string, roles: string[]): Promise<TestAccount> {
  const account = newAccount(label)
  const response = await admin.post('/api/users', { data: { ...account, roles } })
  expect(response.status(), `could not create ${label}`).toBe(201)
  return account
}

// The first-user test creates the run's administrator; later projects sign in with it. The file
// lives in the OS temp folder for this run only (playwright.db.config.ts) and holds a random
// password for an account in the throwaway test database.
function adminFile(): string {
  const file = process.env.E2E_ADMIN_FILE
  if (!file) throw new Error('E2E_ADMIN_FILE is not set (see playwright.db.config.ts).')
  return file
}

export async function saveAdminAccount(account: TestAccount): Promise<void> {
  await writeFile(adminFile(), JSON.stringify(account))
}

export async function loadAdminAccount(): Promise<TestAccount> {
  return JSON.parse(await readFile(adminFile(), 'utf8')) as TestAccount
}
