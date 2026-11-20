import { randomBytes } from 'node:crypto'

import { type APIRequestContext, type APIResponse, expect, request, test } from '@playwright/test'

import { readCommonPasswords } from '../../src/lib/auth/common-passwords'
import { BULK_PASSWORD_MESSAGE } from '../../src/lib/auth/enforce-password-policy'
import { PASSWORD_MESSAGES } from '../../src/lib/auth/password-policy'
import { attemptLogin, createStaff, loadAdminAccount, newAccount, signIn, type TestAccount, visitorAddress } from './support/auth'
import { runTestDbScript } from './support/db-script'

// The staff password policy through Payload's own REST pipeline, on the running server (D-053).
// Every refusal must be a 400 on the `password` path with the policy's message, never a 500, and
// must change nothing. Passwords are random at run time; none is ever printed.
test.describe.configure({ mode: 'serial' })

type User = { id: string | number; email: string }

let baseURL: string
let admin: APIRequestContext
const opened: APIRequestContext[] = []

const random = (length: number) => randomBytes(length).toString('hex').slice(0, length)

type Weak = { name: string; password: string; message: string }

/** One password per rule it breaks, for an account with this email. */
function weakPasswords(email: string): Weak[] {
  const local = email.split('@')[0]!
  const commonLong = [...readCommonPasswords()].find((entry) => [...entry].length >= 12)!
  return [
    { name: '11 characters', password: random(11), message: PASSWORD_MESSAGES.tooShort },
    { name: '129 characters', password: random(129), message: PASSWORD_MESSAGES.tooLong },
    { name: '100 kB', password: random(100_000), message: PASSWORD_MESSAGES.tooLong },
    { name: 'contains "ogserc"', password: `${random(6)}OGSERC${random(6)}`, message: PASSWORD_MESSAGES.organisation },
    { name: 'contains the email local part', password: `${local.toUpperCase()}${random(4)}`, message: PASSWORD_MESSAGES.email },
    { name: 'a common password', password: commonLong, message: PASSWORD_MESSAGES.common },
  ]
}

async function expectPasswordRefused(response: APIResponse, message: string, label: string): Promise<void> {
  const text = await response.text()
  expect(response.status(), `${label}: ${text.slice(0, 300)}`).toBe(400)
  const body = JSON.parse(text) as { errors: { data?: { errors?: { path?: string; message?: string }[] } }[] }
  expect(body.errors[0]?.data?.errors?.[0], label).toEqual(expect.objectContaining({ path: 'password', message }))
}

async function as(account: TestAccount): Promise<APIRequestContext> {
  const context = await signIn(baseURL, account)
  opened.push(context)
  return context
}

async function find(email: string): Promise<User[]> {
  const response = await admin.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
  expect(response.status()).toBe(200)
  return ((await response.json()) as { docs: User[] }).docs
}

async function idOf(email: string): Promise<User['id']> {
  const [user] = await find(email)
  expect(user, `no account ${email}`).toBeDefined()
  return user!.id
}

test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  admin = await as(await loadAdminAccount())
})

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.dispose()))
})

test('an administrator cannot create an account with a password that breaks the policy', async () => {
  const account = { ...newAccount('pw-create'), roles: ['editor'] }
  for (const { name, password, message } of weakPasswords(account.email)) {
    await expectPasswordRefused(await admin.post('/api/users', { data: { ...account, password } }), message, name)
    expect(await find(account.email), `${name}: no account created`).toEqual([])
  }
  // Control: a compliant password is accepted on the same path.
  await createStaff(admin, 'pw-create-ok', ['editor'])
})

test('an account cannot be created without a password', async () => {
  const { password: _password, ...account } = newAccount('pw-missing')
  await expectPasswordRefused(
    await admin.post('/api/users', { data: { ...account, roles: ['editor'] } }),
    PASSWORD_MESSAGES.missing,
    'no password',
  )
  expect(await find(account.email)).toEqual([])
})

test('nobody can change their own password to one that breaks the policy', async () => {
  const account = await createStaff(admin, 'pw-own', ['editor'])
  const self = await as(account)
  const id = await idOf(account.email)
  for (const { name, password, message } of weakPasswords(account.email)) {
    await expectPasswordRefused(await self.patch(`/api/users/${id}`, { data: { password } }), message, name)
  }
  expect((await attemptLogin(baseURL, account.email, account.password)).status, 'old password still works').toBe(200)
  // Control: a compliant change goes through and the new password works.
  const next = random(24)
  expect((await self.patch(`/api/users/${id}`, { data: { password: next } })).status()).toBe(200)
  expect((await attemptLogin(baseURL, account.email, next)).status).toBe(200)
})

test("an administrator cannot set another account's password to one that breaks the policy", async () => {
  const account = await createStaff(admin, 'pw-other', ['publisher'])
  const id = await idOf(account.email)
  for (const { name, password, message } of weakPasswords(account.email)) {
    await expectPasswordRefused(await admin.patch(`/api/users/${id}`, { data: { password } }), message, name)
  }
  expect((await attemptLogin(baseURL, account.email, account.password)).status, 'old password still works').toBe(200)
})

test('a new email and a password built from it, in one request, are refused together', async () => {
  const account = await createStaff(admin, 'pw-email', ['editor'])
  const id = await idOf(account.email)
  const fresh = newAccount('pw-renamed')
  const local = fresh.email.split('@')[0]!
  await expectPasswordRefused(
    await admin.patch(`/api/users/${id}`, { data: { email: fresh.email, password: `${local}${random(4)}` } }),
    PASSWORD_MESSAGES.email,
    'password from the new email',
  )
  expect(await find(fresh.email), 'email unchanged').toEqual([])
  expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)
})

test('an email change that access drops still cannot hide the stored email from the check', async () => {
  // An editor may not change their email (D-048): Payload drops it later. The password is checked
  // against the stored email as well, so sending a different one does not get around the rule.
  const account = await createStaff(admin, 'pw-dropped', ['editor'])
  const self = await as(account)
  const id = await idOf(account.email)
  const local = account.email.split('@')[0]!
  await expectPasswordRefused(
    await self.patch(`/api/users/${id}`, { data: { email: newAccount('pw-decoy').email, password: `${local}${random(4)}` } }),
    PASSWORD_MESSAGES.email,
    'stored email still checked',
  )
  expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)
})

test('a bulk update that sets a password is refused whole, and changes no account', async () => {
  const first = await createStaff(admin, 'pw-bulk-a', ['editor'])
  const second = await createStaff(admin, 'pw-bulk-b', ['editor'])
  const where = [first, second].map((account, n) => `where[email][in][${n}]=${encodeURIComponent(account.email)}`).join('&')
  // A compliant password: the refusal is about setting one password on many accounts, not its strength.
  const response = await admin.patch(`/api/users?${where}`, { data: { password: random(24) } })
  const text = await response.text()
  expect(response.status(), text.slice(0, 300)).toBe(400)
  const body = JSON.parse(text) as { errors: { data?: { errors?: { path?: string; message?: string }[] } }[] }
  expect(body.errors[0]?.data?.errors?.[0]).toEqual({ path: 'password', message: BULK_PASSWORD_MESSAGE })
  for (const account of [first, second]) {
    expect((await attemptLogin(baseURL, account.email, account.password)).status, account.email).toBe(200)
  }
  // Control: the same bulk update without a password still works.
  expect((await admin.patch(`/api/users?${where}`, { data: { name: '[Test] renamed' } })).status()).toBe(200)
})

// --- Reset links (D-053) ---------------------------------------------------------------------
// The reset form's endpoint, with a token issued through the Local API (no email is sent).

const PROBE = 'tests/support/password-probe.ts'

async function issueResetToken(email: string): Promise<string> {
  const { token } = (await runTestDbScript(PROBE, ['issue-token', email])) as { token?: unknown }
  expect(typeof token, 'the probe issued no reset token').toBe('string')
  return token as string
}

/** One reset-password request from a visitor who is not signed in, as the reset form sends it. */
async function resetPassword(token: string, password: string): Promise<APIResponse & { bodyText: string }> {
  const anonymous = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  opened.push(anonymous)
  const response = await anonymous.post('/api/users/reset-password', { data: { token, password } })
  return Object.assign(response, { bodyText: await response.text() })
}

test('a reset link cannot set a password that breaks the policy, and still works afterwards', async () => {
  const account = await createStaff(admin, 'pw-reset', ['editor'])
  const token = await issueResetToken(account.email)
  for (const weak of weakPasswords(account.email)) {
    await expectPasswordRefused(await resetPassword(token, weak.password), weak.message, `reset: ${weak.name}`)
  }
  expect((await attemptLogin(baseURL, account.email, account.password)).status, 'old password still works').toBe(200)

  // Each refusal rolled back, so the same link still sets a compliant password, once.
  const strong = random(24)
  const accepted = await resetPassword(token, strong)
  expect(accepted.status(), accepted.bodyText.slice(0, 300)).toBe(200)
  expect((await attemptLogin(baseURL, account.email, strong)).status, 'new password works').toBe(200)
  expect((await attemptLogin(baseURL, account.email, account.password)).status, 'old password refused').toBe(401)
  expect((await resetPassword(token, random(24))).status(), 'a used link is refused').toBe(403)
})

test('a reset with an invalid link gets the same refusal whatever the password', async () => {
  // The policy is checked only for a valid link, so a guessed token learns nothing from the reply.
  const token = random(40)
  const weak = await resetPassword(token, `ogserc${random(6)}`)
  const strong = await resetPassword(token, random(24))
  expect(weak.status(), weak.bodyText.slice(0, 300)).toBe(403)
  expect(strong.status()).toBe(403)
  expect(weak.bodyText).toBe(strong.bodyText)
})

test('trusted server code cannot get around the policy either', async () => {
  const first = await createStaff(admin, 'pw-probe-a', ['editor'])
  const second = await createStaff(admin, 'pw-probe-b', ['editor'])
  type Outcome = { status: number | string; message?: string }
  const result = (await runTestDbScript(PROBE, ['bypass', first.email, second.email])) as {
    create: Outcome
    created: number
    update: Outcome
    bulk: Outcome
    reset: Outcome
    hashesUnchanged: boolean
    tokenStillIssued: boolean
  }
  const refused = { status: 400, message: PASSWORD_MESSAGES.organisation }
  expect(result.create, 'create').toEqual(refused)
  expect(result.created, 'no account created').toBe(0)
  expect(result.update, 'update by id').toEqual(refused)
  expect(result.bulk, 'bulk update').toEqual({ status: 400, message: BULK_PASSWORD_MESSAGE })
  expect(result.reset, 'resetPassword').toEqual(refused)
  expect(result.hashesUnchanged, 'no password changed').toBe(true)
  expect(result.tokenStillIssued, 'the refused reset kept its token').toBe(true)
  for (const account of [first, second]) {
    expect((await attemptLogin(baseURL, account.email, account.password)).status, account.email).toBe(200)
  }
})
