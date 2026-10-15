import { randomBytes } from 'node:crypto'

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
