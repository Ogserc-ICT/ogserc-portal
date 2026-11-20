import { exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'

import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { MAX_LOGIN_ATTEMPTS } from '../../src/lib/auth/generic-login-error'
import { RESET_MESSAGES } from '../../src/lib/auth/reset-two-factor'
import { databaseIdentity, describeDatabase } from '../../src/lib/db/identity'
import {
  asUser,
  createStaff,
  forgetTotpSecret,
  loadAdminAccount,
  passwordOnlyToken,
  signIn,
  signInToken,
  type TestAccount,
  totpCode,
  totpRequest,
  visitorAddress,
} from './support/auth'

// Resetting another account's two-factor sign-in (D-084, part B): the administrator endpoint and
// the emergency command. After a reset the account is signed out everywhere and must set it up
// again; only a verified administrator may do it, never on their own account; it is audited.
test.describe.configure({ mode: 'serial' })

const exec = promisify(execCallback)

let baseURL: string
let admin: APIRequestContext
let adminAccount: TestAccount
const opened: APIRequestContext[] = []

async function as(headers: Record<string, string>): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL, extraHTTPHeaders: headers })
  opened.push(context)
  return context
}

async function idOf(email: string): Promise<number> {
  const response = await admin.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
  return ((await response.json()) as { docs: { id: number }[] }).docs[0]!.id
}

/** A new editor who has set up two-factor sign-in, and their verified session token. */
async function enrolled(label: string): Promise<{ account: TestAccount; token: string }> {
  const account = await createStaff(admin, label, ['editor'])
  return { account, token: await signInToken(baseURL, account) }
}

async function resets(email: string) {
  const response = await admin.get(`/api/audit-log?where[targetLabel][equals]=${encodeURIComponent(email)}&sort=createdAt&limit=100&depth=0`)
  const docs = ((await response.json()) as { docs: { action: string; actorEmail?: string | null; details?: Record<string, unknown> | null }[] }).docs
  return docs.filter((entry) => entry.action === '2fa.reset').map((entry) => [entry.actorEmail, entry.details])
}

const signedInAs = async (token: string) =>
  ((await (await (await as(asUser(token))).get('/api/users/me')).json()) as { user?: { email?: string } | null }).user?.email ?? null

test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  adminAccount = await loadAdminAccount()
  admin = await signIn(baseURL, adminAccount)
  opened.push(admin)
})

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.dispose()))
})

test('an administrator resets another account: it is signed out, sets it up again, and it is audited', async () => {
  const { account, token } = await enrolled('reset-admin')
  expect(await signedInAs(token)).toBe(account.email)

  const response = await admin.post(`/api/users/${await idOf(account.email)}/reset-2fa`)
  expect(response.status(), await response.text()).toBe(200)
  expect(((await response.json()) as { message: string }).message).toBe(RESET_MESSAGES.done)
  expect(await signedInAs(token), 'the old session ended').toBeNull()

  // The next sign-in goes through set-up again, with a new secret.
  const oldSecret = account.totpSecret
  forgetTotpSecret(account)
  const again = await signIn(baseURL, account)
  opened.push(again)
  expect(account.totpSecret).not.toBe(oldSecret)
  expect((await again.get('/api/users/me')).status()).toBe(200)
  expect(await resets(account.email)).toEqual([[adminAccount.email, { via: 'admin panel or API', reason: 'had two-factor sign-in' }]])
})

test('only an administrator who has entered their own code may reset', async () => {
  const { account } = await enrolled('reset-target')
  const id = await idOf(account.email)
  const publisher = await signIn(baseURL, await createStaff(admin, 'reset-publisher', ['publisher']))
  opened.push(publisher)
  const owingAdmin = await as(asUser(await passwordOnlyToken(baseURL, adminAccount)))
  for (const [who, context] of [
    ['publisher', publisher],
    ['administrator without a code', owingAdmin],
    ['visitor', await as(visitorAddress())],
  ] as const) {
    const response = await context.post(`/api/users/${id}/reset-2fa`)
    expect(response.status(), who).toBe(403)
  }
  expect(await resets(account.email)).toEqual([])
})

test('never on your own account; an unknown or malformed id is not found', async () => {
  const own = await admin.post(`/api/users/${await idOf(adminAccount.email)}/reset-2fa`)
  expect(own.status()).toBe(400)
  expect(((await own.json()) as { message: string }).message).toBe(RESET_MESSAGES.own)
  for (const id of ['999999999', 'abc', '1;drop']) {
    expect((await admin.post(`/api/users/${id}/reset-2fa`)).status(), id).toBe(404)
  }
})

test("the reset also clears a code lock from too many wrong codes", async () => {
  const { account } = await enrolled('reset-lock')
  const token = await passwordOnlyToken(baseURL, account)
  const right = totpCode(account.totpSecret!, 1)
  for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) {
    const code = String((Number(right) + n) % 1_000_000).padStart(6, '0')
    await totpRequest(baseURL, token, '/verify-totp', { token: code })
  }
  expect((await totpRequest(baseURL, token, '/verify-totp', { token: right })).ok, 'locked').toBe(false)

  expect((await admin.post(`/api/users/${await idOf(account.email)}/reset-2fa`)).status()).toBe(200)
  forgetTotpSecret(account)
  opened.push(await signIn(baseURL, account)) // set-up
  opened.push(await signIn(baseURL, account)) // a code check, which a remaining lock would refuse
})

test.describe('the emergency command pnpm auth:reset-2fa', () => {
  async function run(args: string[]): Promise<{ code: number; output: string }> {
    const command = ['pnpm', 'auth:reset-2fa', ...args.map((arg) => JSON.stringify(arg))].join(' ')
    const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' }
    try {
      const { stdout, stderr } = await exec(command, { env })
      return { code: 0, output: `${stdout}${stderr}` }
    } catch (error) {
      const failed = error as { code?: number; stdout?: string; stderr?: string }
      return { code: failed.code ?? 1, output: `${failed.stdout ?? ''}${failed.stderr ?? ''}` }
    }
  }

  test('targets the test database, resets the account as server code, and refuses an unknown email', async () => {
    test.setTimeout(300_000) // `payload run` processes against the test database
    const testDatabase = describeDatabase(databaseIdentity(process.env.TEST_DATABASE_URL))
    const target = await run(['--show-target'])
    expect(target.code, target.output).toBe(0)
    expect(target.output, 'must target the test database').toContain(`Target: ${testDatabase}.`)

    const { account, token } = await enrolled('reset-cli')
    const result = await run([account.email.toUpperCase()])
    expect(result.code, result.output).toBe(0)
    expect(result.output).toContain(`Confirmed: ${testDatabase}: two-factor sign-in reset (it had two-factor sign-in`)
    expect(result.output).not.toMatch(/postgres(ql)?:\/\//)
    expect(await signedInAs(token), 'the old session ended').toBeNull()
    forgetTotpSecret(account)
    opened.push(await signIn(baseURL, account))
    expect(await resets(account.email)).toEqual([[null, { via: 'server code (pnpm auth:reset-2fa)', reason: 'had two-factor sign-in' }]])

    const unknown = await run(['nobody-here@test.invalid'])
    expect(unknown.code, unknown.output).not.toBe(0)
    expect(unknown.output).toContain('No account with that email address')
  })
})
