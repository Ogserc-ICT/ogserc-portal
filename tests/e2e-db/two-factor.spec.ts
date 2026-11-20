import { randomBytes } from 'node:crypto'

import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { MAX_LOGIN_ATTEMPTS } from '../../src/lib/auth/generic-login-error'
import { RULES } from '../../src/lib/auth/rate-limit'
import { TOTP_MESSAGES } from '../../src/lib/auth/two-factor'
import {
  asUser,
  completeTwoFactor,
  createStaff,
  loadAdminAccount,
  markVerified,
  newTotpSecret,
  passwordOnlyToken,
  sessionCookies,
  signIn,
  type TestAccount,
  totpCode,
  totpRequest,
} from './support/auth'

// Two-factor sign-in through the running server (D-084): a session that has not entered a code
// has no access; wrong, reused and too many codes are refused; set-up refuses a short secret; and
// each outcome is in the audit log. Secrets and codes are random at run time; none is printed.
test.describe.configure({ mode: 'serial' })

let baseURL: string
let admin: APIRequestContext
const opened: APIRequestContext[] = []

const address = () => `10.${[...randomBytes(3)].join('.')}`

async function as(headers: Record<string, string>): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL, extraHTTPHeaders: headers })
  opened.push(context)
  return context
}

/** A new editor who has set up two-factor sign-in (their first full sign-in did it). */
async function enrolledEditor(label: string): Promise<TestAccount> {
  const account = await createStaff(admin, label, ['editor'])
  opened.push(await signIn(baseURL, account))
  return account
}

async function twoFactorEntries(email: string) {
  // Filtered here: `action` is a Postgres enum, which a text match (`like`) cannot search.
  const response = await admin.get(`/api/audit-log?where[targetLabel][equals]=${encodeURIComponent(email)}&sort=createdAt&limit=100&depth=0`)
  expect(response.status()).toBe(200)
  return ((await response.json()) as { docs: { action: string; details?: { reason?: string } | null }[] }).docs
    .filter((entry) => entry.action.startsWith('2fa.'))
    .map((entry) => [entry.action, entry.details?.reason])
}

test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  admin = await signIn(baseURL, await loadAdminAccount())
  opened.push(admin)
})

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.dispose()))
})

test('a session that has not entered its code gets no access; entering it opens the rules as written', async () => {
  const account = await enrolledEditor('2fa-access')
  const token = await passwordOnlyToken(baseURL, account)
  const owing = await as(asUser(token))
  expect((await owing.get('/api/users?limit=1')).status()).toBe(403)
  expect((await owing.post('/api/media', { data: {} })).status()).toBe(403)
  // Images are public, so reading them does not need a session at all.
  expect((await owing.get('/api/media?limit=1')).status()).toBe(200)

  await completeTwoFactor(baseURL, account, token)
  const verified = await as(asUser(token))
  expect((await verified.get('/api/users/me')).status()).toBe(200)
  expect((await verified.get('/api/users?limit=1')).status()).toBe(200)
})

test('an account that has never set it up can only set it up', async () => {
  const account = await createStaff(admin, '2fa-new', ['editor'])
  const token = await passwordOnlyToken(baseURL, account)
  const owing = await as(asUser(token))
  // Its own account only, which the set-up screen needs; never anyone else's.
  const list = await owing.get('/api/users?limit=50&depth=0')
  expect(list.status()).toBe(200)
  expect(((await list.json()) as { docs: { email: string }[] }).docs.map((user) => user.email)).toEqual([account.email])
  expect((await owing.post('/api/media', { data: {} })).status()).toBe(403)
})

/**
 * Where the admin panel sends this request: an HTTP redirect's Location, or the target of the
 * redirect Next.js streams in the page (a redirect made while rendering arrives with status 200).
 */
async function adminRedirect(context: APIRequestContext, path: string): Promise<string | undefined> {
  const response = await context.get(path, { maxRedirects: 0 })
  if (response.status() >= 300 && response.status() < 400) return response.headers().location
  const html = await response.text()
  const meta = html.match(/__next-page-redirect[^>]*url=([^"'>]+)/)?.[1]
  return meta ?? html.match(/NEXT_REDIRECT;[a-z]+;([^;"\\]+)/)?.[1]
}

test('the admin panel sends a session that owes a code to the code page, which loads', async () => {
  const account = await enrolledEditor('2fa-panel')
  const token = await passwordOnlyToken(baseURL, account)
  // As a browser sends it: cookies, and Sec-Fetch-Site, without which the CSRF check (D-052)
  // does not accept a cookie session at all.
  const owing = await as({ Cookie: sessionCookies(token), 'Sec-Fetch-Site': 'same-origin' })
  expect(await adminRedirect(owing, '/admin'), 'a session that owes a code').toContain('/admin/verify-totp')
  // Control: without a session the panel sends the visitor to sign in instead.
  expect(await adminRedirect(await as({ 'Sec-Fetch-Site': 'same-origin' }), '/admin'), 'no session').toContain('/admin/login')
  // The code page itself loads without redirecting again: proxy.ts passes it the path.
  const page = await owing.get('/admin/verify-totp', { maxRedirects: 0 })
  expect(page.status()).toBe(200)
  expect(await adminRedirect(owing, '/admin/verify-totp'), 'no redirect loop').toBeUndefined()
})

test('a wrong code is refused, a correct one accepted once, and both are audited', async () => {
  const account = await enrolledEditor('2fa-codes')
  const token = await passwordOnlyToken(baseURL, account)
  const right = totpCode(account.totpSecret!, 1)
  const wrong = right === '000000' ? '111111' : '000000'
  expect((await totpRequest(baseURL, token, '/verify-totp', { token: wrong })).ok).toBe(false)
  const accepted = await totpRequest(baseURL, token, '/verify-totp', { token: right })
  expect(accepted.ok && accepted.cookie).toBeTruthy()
  const again = await totpRequest(baseURL, await passwordOnlyToken(baseURL, account), '/verify-totp', { token: right })
  expect(again).toMatchObject({ ok: false, message: TOTP_MESSAGES.reused })
  expect(await twoFactorEntries(account.email)).toEqual([
    ['2fa.enrolled', undefined],
    ['2fa.failed', 'wrong code'],
    ['2fa.verified', undefined],
    ['2fa.failed', 'code already used'],
  ])
})

test('after too many wrong codes the plugin refuses even the right one', async () => {
  const account = await enrolledEditor('2fa-lock')
  const token = await passwordOnlyToken(baseURL, account)
  const right = totpCode(account.totpSecret!, 1)
  const wrong = right === '000000' ? '111111' : '000000'
  for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) {
    // A different wrong code each time, so the "already used" check does not answer first.
    const code = String((Number(wrong) + n) % 1_000_000).padStart(6, '0')
    if (code === right) continue
    expect((await totpRequest(baseURL, token, '/verify-totp', { token: code })).ok, `wrong code ${n}`).toBe(false)
  }
  const locked = await totpRequest(baseURL, token, '/verify-totp', { token: right })
  expect(locked.ok).toBe(false)
  expect((await as(asUser(token))).get('/api/users?limit=1').then((response) => response.status())).resolves.toBe(403)
})

test('one address gets a limited number of code checks, then 429', async () => {
  const account = await enrolledEditor('2fa-limit')
  const token = await passwordOnlyToken(baseURL, account)
  const ip = address()
  // No code at all: the plugin refuses it without counting it against the account.
  for (let n = 1; n <= RULES.totpIp.limit; n++) {
    expect((await totpRequest(baseURL, token, '/verify-totp', {}, ip)).status, `check ${n}`).not.toBe(429)
  }
  const limited = await totpRequest(baseURL, token, '/verify-totp', { token: totpCode(account.totpSecret!) }, ip)
  expect(limited.status).toBe(429)
  expect(limited.message).toMatch(/^Too many attempts/)
  expect((await totpRequest(baseURL, token, '/verify-totp', {}, address())).status, 'another address').not.toBe(429)
})

test('set-up refuses a secret under 160 bits; a full-length one sets it up', async () => {
  const account = await createStaff(admin, '2fa-weak', ['editor'])
  const token = await passwordOnlyToken(baseURL, account)
  const short = newTotpSecret(10) // 80 bits
  const refused = await totpRequest(baseURL, token, '/setup-totp', { secret: short, token: totpCode(short) })
  expect(refused).toMatchObject({ ok: false, message: TOTP_MESSAGES.weakSecret })
  expect((await as(asUser(token))).post('/api/media', { data: {} }).then((response) => response.status())).resolves.toBe(403)

  const secret = newTotpSecret()
  const setup = await totpRequest(baseURL, token, '/setup-totp', { secret, token: totpCode(secret) })
  expect(setup.ok && setup.cookie).toBeTruthy()
  markVerified(token, setup.cookie!)
  expect((await (await as(asUser(token))).get('/api/users/me')).status()).toBe(200)
  expect(await twoFactorEntries(account.email)).toEqual([
    ['2fa.failed', 'set-up key too short'],
    ['2fa.enrolled', undefined],
  ])
})

test('the secret is never readable through the API, even by an administrator', async () => {
  const account = await enrolledEditor('2fa-secret')
  const response = await admin.get(`/api/users?where[email][equals]=${encodeURIComponent(account.email)}&depth=0`)
  const text = await response.text()
  expect(response.status()).toBe(200)
  expect(text).not.toContain(account.totpSecret!)
  expect(text).not.toMatch(/"totpSecret"\s*:\s*"/)
})
