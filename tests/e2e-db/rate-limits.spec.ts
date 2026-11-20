import { randomBytes } from 'node:crypto'

import { type APIRequestContext, type APIResponse, expect, request, test } from '@playwright/test'

import { RULES, tooManyMessage } from '../../src/lib/auth/rate-limit'
import { createStaff, loadAdminAccount, newAccount, signIn, visitorAddress } from './support/auth'

// Sign-in, forgotten-password and reset-link limits through Payload's REST pipeline, on the running
// server (D-081). Each test uses its own made-up addresses and fresh emails, so tests never share
// a window. Passwords are random at run time; none is printed.
test.describe.configure({ mode: 'serial' })

let baseURL: string
let admin: APIRequestContext
const opened: APIRequestContext[] = []

/** A fresh private address that no other test uses (10.x.x.x, never a real visitor). */
const address = () => `10.${[...randomBytes(3)].join('.')}`
const wrong = () => randomBytes(18).toString('base64url')

async function from(ip: string): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress(ip) })
  opened.push(context)
  return context
}

const login = async (ip: string, email: string, password: string) =>
  (await from(ip)).post('/api/users/login', { data: { email, password } })

/** Asserts the 429: fixed message, Retry-After within the window, and no hint about the account. */
async function expectLimited(response: APIResponse, rule: keyof typeof RULES, label: string): Promise<string> {
  const text = await response.text()
  expect(response.status(), `${label}: ${text.slice(0, 300)}`).toBe(429)
  const retryAfter = Number(response.headers()['retry-after'])
  expect(retryAfter, `${label}: Retry-After`).toBeGreaterThan(0)
  expect(retryAfter, `${label}: Retry-After`).toBeLessThanOrEqual(RULES[rule].windowSeconds)
  const body = JSON.parse(text) as { errors: { message: string }[] }
  expect(body.errors[0]?.message, label).toBe(tooManyMessage(Math.ceil(retryAfter / 60)))
  return body.errors[0]!.message
}

test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  admin = await signIn(baseURL, await loadAdminAccount())
  opened.push(admin)
})

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.dispose()))
})

test('one address gets its sign-in limit, then 429 with Retry-After; another address is not affected', async () => {
  const ip = address()
  for (let n = 1; n <= RULES.loginIp.limit; n++) {
    expect((await login(ip, newAccount('rl-ip').email, wrong())).status(), `attempt ${n}`).toBe(401)
  }
  await expectLimited(await login(ip, newAccount('rl-ip').email, wrong()), 'loginIp', 'over the address limit')
  expect((await login(address(), newAccount('rl-ip').email, wrong())).status(), 'another address').toBe(401)
})

test('an email gets its failure limit from any address, and a known account gets the same reply as an unknown one', async () => {
  const account = await createStaff(admin, 'rl-email', ['editor'])
  const unknown = newAccount('rl-nobody').email
  for (let n = 1; n <= RULES.loginEmail.limit; n++) {
    // Each from a new address, so only the email limit applies. The account locks at 5 and still says 401.
    expect((await login(address(), account.email, wrong())).status(), `known, failure ${n}`).toBe(401)
    expect((await login(address(), unknown, wrong())).status(), `unknown, failure ${n}`).toBe(401)
  }
  const known = await expectLimited(await login(address(), account.email, account.password), 'loginEmail', 'known, right password')
  const other = await expectLimited(await login(address(), unknown, wrong()), 'loginEmail', 'unknown')
  expect(known).toBe(other)
})

test('a successful sign-in never counts against the email', async () => {
  const account = await createStaff(admin, 'rl-ok', ['editor'])
  for (let n = 1; n <= RULES.loginEmail.limit + 2; n++) {
    expect((await login(address(), account.email, account.password)).status(), `sign-in ${n}`).toBe(200)
  }
})

test('forgotten password: limited per email and per address, with the same reply for known and unknown emails', async () => {
  const account = await createStaff(admin, 'rl-forgot', ['editor'])
  const forgot = async (ip: string, email: string) => (await from(ip)).post('/api/users/forgot-password', { data: { email } })
  const unknown = newAccount('rl-forgot-nobody').email
  for (let n = 1; n <= RULES.forgotEmail.limit; n++) {
    expect((await forgot(address(), account.email)).status(), `known ${n}`).toBe(200)
    expect((await forgot(address(), unknown)).status(), `unknown ${n}`).toBe(200)
  }
  const known = await expectLimited(await forgot(address(), account.email), 'forgotEmail', 'known email')
  expect(await expectLimited(await forgot(address(), unknown), 'forgotEmail', 'unknown email')).toBe(known)

  const ip = address()
  for (let n = 1; n <= RULES.forgotIp.limit; n++) {
    expect((await forgot(ip, newAccount('rl-forgot-ip').email)).status(), `address ${n}`).toBe(200)
  }
  await expectLimited(await forgot(ip, newAccount('rl-forgot-ip').email), 'forgotIp', 'over the address limit')
})

test('reset links: limited per address, whatever the token', async () => {
  const ip = address()
  const reset = async () =>
    (await from(ip)).post('/api/users/reset-password', { data: { token: randomBytes(20).toString('hex'), password: wrong() } })
  for (let n = 1; n <= RULES.resetIp.limit; n++) expect((await reset()).status(), `reset ${n}`).toBe(403)
  await expectLimited(await reset(), 'resetIp', 'over the address limit')
})

test('the counters cannot be read or changed through the API, even by an administrator', async () => {
  for (const response of [
    await admin.get('/api/rate-limits'),
    await admin.post('/api/rate-limits', { data: { key: 'x', count: 0, expiresAt: new Date().toISOString() } }),
    await admin.delete('/api/rate-limits?where[id][exists]=true'),
  ]) {
    expect(response.status(), (await response.text()).slice(0, 200)).toBe(403)
  }
})
