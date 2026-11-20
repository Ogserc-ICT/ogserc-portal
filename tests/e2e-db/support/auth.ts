import { createHmac, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'

import { type APIRequestContext, expect, request } from '@playwright/test'

// Shared sign-in helpers for database-backed tests. Every test signs in through these, so when
// two-factor authentication changes what signing in involves, only this file changes. Since D-084
// a full sign-in is the password, then a code from the account's authenticator secret: set up on
// the account's first sign-in, entered on every later one.

/** `totpSecret` is set once the helpers have set up two-factor sign-in for the account. */
export type TestAccount = {
  email: string
  password: string
  name: string
  totpSecret?: string
  /** Only for the run's administrator, in the admin file: a verified session to reuse. */
  session?: { token: string; cookie: string }
}

/** A new account with a random password and an address that can never receive mail. */
export function newAccount(label: string): TestAccount {
  const id = randomBytes(4).toString('hex')
  return {
    email: `${label}-${id}@test.invalid`,
    password: randomBytes(24).toString('base64url'),
    name: `[Test] ${label}`,
  }
}

/**
 * A made-up visitor address in CLIENT_IP_HEADER (X-Forwarded-For, playwright.db.config.ts), so each
 * request context counts against its own sign-in limit instead of one shared by the whole run
 * (D-081). Private range 10.x.x.x; never a real visitor's address.
 */
export function visitorAddress(address = `10.${[...randomBytes(3)].join('.')}`): Record<string, string> {
  return { 'X-Forwarded-For': address }
}

/** Name of Payload's session cookie (default cookie prefix "payload"). */
export const SESSION_COOKIE = 'payload-token'
/** The two-factor plugin's "code entered" cookie (`<cookie prefix>-totp`). */
export const TOTP_COOKIE = 'payload-totp'

/** The "code entered" cookie for each session token this process has completed. */
const verifiedSessions = new Map<string, string>()

/** Request headers that act as the signed-in user, with the code entered if this process entered it. */
export function asUser(token: string): Record<string, string> {
  const verified = verifiedSessions.get(token)
  return { Authorization: `JWT ${token}`, ...(verified ? { Cookie: `${TOTP_COOKIE}=${verified}` } : {}) }
}

/** A Cookie header value for the session sent as cookies, as a browser does. */
export function sessionCookies(token: string): string {
  const verified = verifiedSessions.get(token)
  return [`${SESSION_COOKIE}=${token}`, ...(verified ? [`${TOTP_COOKIE}=${verified}`] : [])].join('; ')
}

// --- Authenticator codes (RFC 6238: SHA-1, 6 digits, 30 seconds, as the site uses) ------------

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export const TOTP_PERIOD_SECONDS = 30

/** A new authenticator secret: 20 random bytes (160 bits) by default, in base32. */
export function newTotpSecret(bytes = 20): string {
  let bits = ''
  for (const byte of randomBytes(bytes)) bits += byte.toString(2).padStart(8, '0')
  return (bits.match(/.{1,5}/g) ?? []).map((chunk) => BASE32[parseInt(chunk.padEnd(5, '0'), 2)]).join('')
}

function base32Bytes(secret: string): Buffer {
  const bits = [...secret.replace(/=+$/, '').toUpperCase()]
    .map((char) => BASE32.indexOf(char).toString(2).padStart(5, '0'))
    .join('')
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)))
}

/** The code an authenticator app shows for `secret` now, or `steps` periods away from now. */
export function totpCode(secret: string, steps = 0, at = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / TOTP_PERIOD_SECONDS) + steps))
  const hash = createHmac('sha1', base32Bytes(secret)).update(counter).digest()
  const offset = hash[hash.length - 1]! & 0x0f
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

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
  const anonymous = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  try {
    const response = await anonymous.post('/api/users/login', { data: { email, password } })
    const token = response.ok() ? sessionCookie(response.headersArray())?.value : undefined
    return { status: response.status(), body: await response.text(), token }
  } finally {
    await anonymous.dispose()
  }
}

/** The plugin's "code entered" cookie from a response, if it set one. */
function totpCookie(headers: { name: string; value: string }[]): string | undefined {
  for (const { name, value } of headers) {
    if (name.toLowerCase() !== 'set-cookie' || !value.startsWith(`${TOTP_COOKIE}=`)) continue
    return value.split(';')[0]!.slice(TOTP_COOKIE.length + 1)
  }
  return undefined
}

/** A password-only session's request to one of the plugin's endpoints, from its own address. */
export async function totpRequest(baseURL: string, token: string, path: string, data: Record<string, string>, address?: string) {
  const context = await request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `JWT ${token}`, ...visitorAddress(address) } })
  try {
    const response = await context.post(`/api${path}`, { data })
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string }
    return { ok: body.ok === true, message: body.message, cookie: totpCookie(response.headersArray()), status: response.status() }
  } finally {
    await context.dispose()
  }
}

/** Records that this session has entered a code, so asUser and sessionCookies send its cookie. */
export function markVerified(token: string, cookie: string): void {
  verifiedSessions.set(token, cookie)
}

/** Rounds of codes to try before giving up: each new 30-second period brings one unused code. */
const CODE_ROUNDS = 5

/**
 * Completes two-factor sign-in for a password-only session: sets it up on the account's first
 * sign-in, otherwise enters a code. A code can be used only once (D-084), and the codes for the
 * previous, current and next period are all accepted, so it tries the newest first and, if this
 * account has used all three, waits for the next period.
 */
export async function completeTwoFactor(baseURL: string, account: TestAccount, token: string): Promise<void> {
  const secret = await secretOf(account)
  if (!secret) {
    const fresh = newTotpSecret()
    const setup = await totpRequest(baseURL, token, '/setup-totp', { secret: fresh, token: totpCode(fresh) })
    expect(setup.ok && setup.cookie, `2FA set-up failed for ${account.email}: ${setup.status} ${setup.message}`).toBeTruthy()
    await rememberSecret(account, fresh)
    markVerified(token, setup.cookie!)
    return
  }
  const period = TOTP_PERIOD_SECONDS * 1000
  for (let round = 1; round <= CODE_ROUNDS; round++) {
    for (const steps of [1, 0, -1]) {
      const verify = await totpRequest(baseURL, token, '/verify-totp', { token: totpCode(secret, steps) })
      if (verify.ok && verify.cookie) {
        markVerified(token, verify.cookie)
        return
      }
      expect(verify.message, `2FA code refused for ${account.email}: ${verify.status} ${verify.message}`).toMatch(/already been used/)
    }
    await new Promise((resolve) => setTimeout(resolve, period - (Date.now() % period) + 200))
  }
  throw new Error(`No unused 2FA code was accepted for ${account.email} in ${CODE_ROUNDS} periods.`)
}

/** Signs in with the password only: the session exists but owes a code, so it has no access. */
export async function passwordOnlyToken(baseURL: string, account: TestAccount): Promise<string> {
  const { status, token } = await attemptLogin(baseURL, account.email, account.password)
  expect(token, `sign-in failed for ${account.email} (${status})`).toBeTruthy()
  return token!
}

/**
 * Signs in fully (password, then 2FA) and returns the session token, failing the test if refused.
 * The run's administrator signs in at the start of nearly every test file, faster than an
 * authenticator gives out new codes (one per 30 seconds, each usable once), so its verified
 * session is kept in the admin file and reused while it is still valid.
 */
export async function signInToken(baseURL: string, account: TestAccount): Promise<string> {
  const admin = await adminOnFile()
  const isAdmin = admin?.email === account.email
  if (isAdmin && admin.session && (await stillSignedIn(baseURL, account, admin.session))) {
    markVerified(admin.session.token, admin.session.cookie)
    return admin.session.token
  }
  const token = await passwordOnlyToken(baseURL, account)
  await completeTwoFactor(baseURL, account, token)
  if (isAdmin) await saveAdminAccount({ ...(await adminOnFile())!, session: { token, cookie: verifiedSessions.get(token)! } })
  return token
}

/** Whether a saved session still acts as this account. */
async function stillSignedIn(baseURL: string, account: TestAccount, session: { token: string; cookie: string }) {
  const context = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Authorization: `JWT ${session.token}`, Cookie: `${TOTP_COOKIE}=${session.cookie}` },
  })
  try {
    const response = await context.get('/api/users/me')
    const body = (await response.json().catch(() => ({}))) as { user?: { email?: string } | null }
    return response.ok() && body.user?.email === account.email
  } finally {
    await context.dispose()
  }
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

// Secrets live on the account object, and for the administrator also in the run's admin file,
// because later test projects (other processes) sign in with it.
const secretsByEmail = new Map<string, string>()

async function adminOnFile(): Promise<TestAccount | undefined> {
  const file = process.env.E2E_ADMIN_FILE
  return file && existsSync(file) ? (JSON.parse(await readFile(file, 'utf8')) as TestAccount) : undefined
}

async function secretOf(account: TestAccount): Promise<string | undefined> {
  if (account.totpSecret) return account.totpSecret
  const known = secretsByEmail.get(account.email)
  if (known) return (account.totpSecret = known)
  const admin = await adminOnFile()
  if (admin?.email === account.email && admin.totpSecret) return (account.totpSecret = admin.totpSecret)
  return undefined
}

async function rememberSecret(account: TestAccount, secret: string): Promise<void> {
  account.totpSecret = secret
  secretsByEmail.set(account.email, secret)
  const admin = await adminOnFile()
  if (admin?.email === account.email) await saveAdminAccount({ ...admin, totpSecret: secret })
}

/** Forgets the account's secret, after a test has reset its two-factor sign-in. */
export function forgetTotpSecret(account: TestAccount): void {
  delete account.totpSecret
  secretsByEmail.delete(account.email)
}

/** Verified sessions this process may hand out again, by email (signInOnce). */
const reusableSessions = new Map<string, string>()

/**
 * Like signIn, but reuses this account's verified session from earlier in the same test file
 * while it still works (an account gets one new 2FA code per 30 seconds, each usable once).
 * For tests that sign the same account in many times and do not test sessions themselves; a
 * session that no longer works (account deleted, demoted, or signed out) is replaced by a new one.
 */
export async function signInOnce(baseURL: string, account: TestAccount): Promise<APIRequestContext> {
  const token = reusableSessions.get(account.email)
  const cookie = token ? verifiedSessions.get(token) : undefined
  if (token && cookie && (await stillSignedIn(baseURL, account, { token, cookie }))) {
    return request.newContext({ baseURL, extraHTTPHeaders: asUser(token) })
  }
  const fresh = await signInToken(baseURL, account)
  reusableSessions.set(account.email, fresh)
  return request.newContext({ baseURL, extraHTTPHeaders: asUser(fresh) })
}
