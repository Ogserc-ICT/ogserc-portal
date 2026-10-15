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

/**
 * Signs in and returns a request context that acts as that user and nobody else. Each context
 * has its own cookie jar, so tests can hold several users at once without mixing them up.
 */
export async function signIn(baseURL: string, account: TestAccount): Promise<APIRequestContext> {
  const anonymous = await request.newContext({ baseURL })
  const response = await anonymous.post('/api/users/login', {
    data: { email: account.email, password: account.password },
  })
  expect(response.ok(), `sign-in failed for ${account.email} (${response.status()})`).toBe(true)
  const { token } = (await response.json()) as { token: string }
  await anonymous.dispose()
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
