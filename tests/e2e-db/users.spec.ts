import { exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'

import { type APIRequestContext, expect, request, test } from '@playwright/test'

import {
  asUser,
  attemptLogin,
  createStaff,
  loadAdminAccount,
  newAccount,
  SESSION_COOKIE,
  sessionCookie,
  signIn,
  signInToken,
  type TestAccount,
} from './support/auth'
import { LOCK_MINUTES, LOGIN_FAILED_MESSAGE, MAX_LOGIN_ATTEMPTS } from '../../src/lib/auth/generic-login-error'
import { databaseIdentity, describeDatabase } from '../../src/lib/db/identity'
import { fakeSecret } from '../support/fakes'
import { runTestDbScript } from './support/db-script'

// Staff accounts: who may change roles, emails and Payload's internal auth fields (SRS Section 10,
// FR-CMS-05/06, NFR-SEC-02). Every check reads the stored record back as an administrator, because
// Payload drops a field that access denies without an error.
test.describe.configure({ mode: 'serial' })

const exec = promisify(execCallback)

type User = { id: string | number; email: string; roles?: string[] } & Record<string, unknown>

let baseURL: string
let admin: APIRequestContext
const opened: APIRequestContext[] = []

async function as(account: TestAccount): Promise<APIRequestContext> {
  const context = await signIn(baseURL, account)
  opened.push(context)
  return context
}

async function stored(email: string): Promise<User> {
  const response = await admin.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
  expect(response.status()).toBe(200)
  const { docs } = (await response.json()) as { docs: User[] }
  expect(docs, `no account ${email}`).toHaveLength(1)
  return docs[0]!
}

/** The permissions the admin panel reads (`/api/access`). */
async function permissions(context: APIRequestContext): Promise<Record<string, unknown>> {
  const response = await context.get('/api/access')
  expect(response.status()).toBe(200)
  return (await response.json()) as Record<string, unknown>
}

/**
 * Whether a permission path is allowed. Payload's sanitizePermissions leaves out anything false
 * and collapses a branch whose permissions are all true to `true`, at any level.
 */
function allowed(tree: unknown, path: string[]): boolean {
  let node = tree
  for (const key of path) {
    if (node === true) return true
    if (!node || typeof node !== 'object') return false
    node = (node as Record<string, unknown>)[key]
  }
  if (node && typeof node === 'object') return (node as { permission?: unknown }).permission === true
  return node === true
}

const canAccessAdmin = async (context: APIRequestContext) => allowed(await permissions(context), ['canAccessAdmin'])

const canUpdateEmail = async (context: APIRequestContext) =>
  allowed(await permissions(context), ['collections', 'users', 'fields', 'email', 'update'])

test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  admin = await signIn(baseURL, await loadAdminAccount())
  opened.push(admin)
})

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.dispose()))
})

test.describe('roles', () => {
  test('a non-administrator cannot set roles on their own account or anyone else', async () => {
    const editorAccount = await createStaff(admin, 'roles-editor', ['editor'])
    const other = await createStaff(admin, 'roles-other', ['editor'])
    const editor = await as(editorAccount)
    const self = await stored(editorAccount.email)

    const ownChange = await editor.patch(`/api/users/${self.id}`, { data: { roles: ['administrator'] } })
    expect(ownChange.status()).toBeLessThan(500)
    expect((await stored(editorAccount.email)).roles).toEqual(['editor'])

    const otherId = (await stored(other.email)).id
    const otherChange = await editor.patch(`/api/users/${otherId}`, { data: { roles: ['administrator'] } })
    expect([403, 404]).toContain(otherChange.status())
    expect((await stored(other.email)).roles).toEqual(['editor'])

    const created = await editor.post('/api/users', { data: { ...newAccount('x'), roles: ['administrator'] } })
    expect(created.status()).toBe(403)
  })

  test('an administrator cannot change their own roles, even in a bulk update', async () => {
    const secondAdminAccount = await createStaff(admin, 'roles-admin', ['administrator'])
    const target = await createStaff(admin, 'roles-target', ['editor'])
    const secondAdmin = await as(secondAdminAccount)
    const selfId = (await stored(secondAdminAccount.email)).id
    const targetId = (await stored(target.email)).id

    await secondAdmin.patch(`/api/users/${selfId}`, { data: { roles: ['editor'] } })
    expect((await stored(secondAdminAccount.email)).roles).toEqual(['administrator'])

    const bulk = await secondAdmin.patch(
      `/api/users?where[id][in][0]=${selfId}&where[id][in][1]=${targetId}&depth=0`,
      { data: { roles: ['publisher'] } },
    )
    expect(bulk.status()).toBeLessThan(500)
    expect((await stored(secondAdminAccount.email)).roles).toEqual(['administrator'])
    // The same request does change the other account, so the bulk update itself ran.
    expect((await stored(target.email)).roles).toEqual(['publisher'])
  })

  test('an unknown role and an empty list of roles are rejected', async () => {
    const account = await createStaff(admin, 'roles-invalid', ['editor'])
    const { id } = await stored(account.email)
    for (const roles of [['superuser'], ['editor', 'superuser'], [], ['']]) {
      const response = await admin.patch(`/api/users/${id}`, { data: { roles } })
      expect(response.status(), `roles ${JSON.stringify(roles)}`).toBe(400)
      expect((await stored(account.email)).roles).toEqual(['editor'])
    }
    const created = await admin.post('/api/users', {
      data: { ...newAccount('roles-new'), roles: ['superuser'] },
    })
    expect(created.status()).toBe(400)
  })

  test('a demotion takes effect on the next request with the same session', async () => {
    const account = await createStaff(admin, 'roles-demoted', ['administrator'])
    const demoted = await as(account)
    const before = await demoted.get('/api/users?depth=0')
    expect(((await before.json()) as { totalDocs: number }).totalDocs).toBeGreaterThan(1)

    const { id } = await stored(account.email)
    expect((await admin.patch(`/api/users/${id}`, { data: { roles: ['editor'] } })).status()).toBe(200)

    // Same token: the role change ended the session (endSessionsOnRoleChange), so it now has no
    // access at all, not even an editor's: it cannot list accounts or create one.
    expect((await demoted.get('/api/users?depth=0')).status()).toBe(403)
    const create = await demoted.post('/api/users', { data: { ...newAccount('y'), roles: ['editor'] } })
    expect(create.status()).toBe(403)
    // Signing in again gives the editor's access: only their own account.
    const again = await as(account)
    expect(((await (await again.get('/api/users?depth=0')).json()) as { totalDocs: number }).totalDocs).toBe(1)
  })

  test('roles are not stored in the session token', async () => {
    const account = await createStaff(admin, 'roles-jwt', ['publisher'])
    const token = await signInToken(baseURL, account)
    const claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8')) as Record<string, unknown>
    expect(claims).not.toHaveProperty('roles')
    expect(claims).toHaveProperty('id')
  })

  test('an account with no roles is refused everywhere', async () => {
    test.setTimeout(120_000) // includes a `payload run` against the test database
    const account = await createStaff(admin, 'roles-none', ['editor'])
    await runTestDbScript('tests/support/strip-roles.ts', [account.email])
    expect((await stored(account.email)).roles ?? []).toEqual([])

    const noRoles = await as(account)
    expect((await noRoles.get('/api/users?depth=0')).status()).toBe(403)
    expect((await noRoles.get('/api/media?depth=0')).status()).toBe(200) // public read only
    const upload = await noRoles.post('/api/media', {
      multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('x') }, _payload: '{"alt":"[Test]"}' },
    })
    expect(upload.status()).toBe(403)
    // The admin panel's own access check (collection `admin` access). Payload leaves out
    // permissions that are false, so "missing" means no access; the administrator shows true.
    expect(await canAccessAdmin(noRoles)).toBe(false)
    expect(await canAccessAdmin(admin)).toBe(true)
  })
})

test.describe('internal auth fields', () => {
  test('a non-administrator cannot change them on their own account', async () => {
    const account = await createStaff(admin, 'internal', ['editor'])
    const editor = await as(account)
    const { id } = await stored(account.email)
    // Fakes built at run time (tests/support/fakes.ts); none can work anywhere.
    const resetToken = fakeSecret(20)
    const future = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()

    const response = await editor.patch(`/api/users/${id}`, {
      data: {
        hash: fakeSecret(),
        salt: fakeSecret(),
        loginAttempts: 4,
        lockUntil: future,
        resetPasswordToken: resetToken,
        resetPasswordExpiration: future,
        _verified: true,
        apiKey: fakeSecret(),
        enableAPIKey: true,
      },
    })
    expect(response.status()).toBeLessThan(500)

    // hash, salt and lockUntil unchanged: the original password still signs in.
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)
    // loginAttempts unchanged: had it become 4, one more failure would lock the account (limit 5).
    expect((await attemptLogin(baseURL, account.email, fakeSecret())).status).toBe(401)
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)
    // resetPasswordToken not stored: it cannot be used to set a new password.
    const anonymous = await request.newContext({ baseURL })
    opened.push(anonymous)
    const reset = await anonymous.post('/api/users/reset-password', {
      data: { token: resetToken, password: fakeSecret() },
    })
    expect(reset.ok()).toBe(false)
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)
    // API keys and verification are off: nothing was added to the record.
    const record = await stored(account.email)
    for (const field of ['apiKey', 'enableAPIKey', '_verified', 'hash', 'salt', 'resetPasswordToken']) {
      expect(record, field).not.toHaveProperty(field)
    }
  })
})

test.describe('sessions and cookies', () => {
  const ONE_HOUR = 3600

  function claims(token: string): { iat: number; exp: number } {
    return JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8')) as { iat: number; exp: number }
  }

  /** An attribute as Payload writes it ("HttpOnly=true", "SameSite=Strict"), matched by name. */
  function attribute(attributes: string[], name: string): string | undefined {
    return attributes.find((part) => part.split('=')[0]!.toLowerCase() === name.toLowerCase())
  }

  test('the session token is only in the cookie, which is HttpOnly, SameSite=Strict and lasts an hour', async () => {
    const account = await createStaff(admin, 'cookie', ['editor'])
    const anonymous = await request.newContext({ baseURL })
    opened.push(anonymous)
    const response = await anonymous.post('/api/users/login', { data: { email: account.email, password: account.password } })
    expect(response.status()).toBe(200)
    expect(await response.json()).not.toHaveProperty('token')

    const cookie = sessionCookie(response.headersArray())
    expect(cookie, 'login sets the session cookie').toBeDefined()
    const { attributes } = cookie!
    expect(attribute(attributes, 'HttpOnly')).toBeDefined()
    expect(attribute(attributes, 'SameSite')).toBe('SameSite=Strict')
    expect(attribute(attributes, 'Path')).toBe('Path=/')
    const expires = Date.parse(attribute(attributes, 'Expires')!.slice('Expires='.length))
    expect(Math.abs(expires - (Date.now() + ONE_HOUR * 1000))).toBeLessThan(2 * 60 * 1000)

    // Secure comes from NODE_ENV=production (Users.ts), so only the production build sets it.
    // CI always tests that build; the local dev server cannot, and the check is skipped there.
    if (process.env.E2E_SERVER_MODE === 'start') {
      expect(attribute(attributes, 'Secure'), 'the production build sets Secure').toBeDefined()
    } else {
      test.info().annotations.push({ type: 'skipped check', description: 'Secure flag: dev server (checked in CI)' })
    }

    const { iat, exp } = claims(cookie!.value)
    expect(exp - iat).toBe(ONE_HOUR)
  })

  test('me and refresh never return the token in their bodies', async () => {
    const account = await createStaff(admin, 'no-token', ['editor'])
    const token = await signInToken(baseURL, account)
    const user = await request.newContext({ baseURL, extraHTTPHeaders: asUser(token) })
    opened.push(user)

    const me = await user.get('/api/users/me')
    expect(me.status()).toBe(200)
    const meBody = (await me.json()) as Record<string, unknown>
    expect((meBody.user as { email?: string } | null)?.email).toBe(account.email)
    expect(meBody).not.toHaveProperty('token')

    const refresh = await user.post('/api/users/refresh-token')
    expect(refresh.status()).toBe(200)
    const refreshBody = (await refresh.json()) as Record<string, unknown>
    expect(refreshBody).not.toHaveProperty('refreshedToken')
    expect(refreshBody).not.toHaveProperty('token')
    // The new token arrives as a cookie, again valid for one hour.
    const renewed = sessionCookie(refresh.headersArray())
    expect(renewed, 'refresh sets the session cookie').toBeDefined()
    const { iat, exp } = claims(renewed!.value)
    expect(exp - iat).toBe(ONE_HOUR)
  })

  test('a session can be refreshed only while the new token would end within 12 hours of sign-in', async () => {
    test.setTimeout(240_000) // includes two `payload run` processes against the test database
    const account = await createStaff(admin, 'session-cap', ['editor'])
    let token = await signInToken(baseURL, account)

    async function refresh(): Promise<number> {
      const context = await request.newContext({ baseURL, extraHTTPHeaders: asUser(token) })
      opened.push(context)
      const response = await context.post('/api/users/refresh-token')
      const renewed = sessionCookie(response.headersArray())?.value
      if (response.ok() && renewed) token = renewed
      return response.status()
    }

    expect(await refresh(), 'fresh session').toBe(200)
    const { iat, exp } = claims(token)
    expect(exp - iat).toBe(ONE_HOUR)

    // Signed in 10 hours ago: a new one-hour token would end at 11 hours, inside the limit.
    await runTestDbScript('tests/support/age-session.ts', [account.email, '10'])
    expect(await refresh(), 'session started 10 h ago').toBe(200)

    // Signed in 11.5 hours ago: a new token would end at 12.5 hours, so the refresh is refused.
    await runTestDbScript('tests/support/age-session.ts', [account.email, '11.5'])
    expect(await refresh(), 'session started 11.5 h ago').toBe(403)

    // Signing in again starts a new session, which can be refreshed.
    token = await signInToken(baseURL, account)
    expect(await refresh(), 'new session after signing in again').toBe(200)
  })

  test('an API key header signs nobody in', async () => {
    const anonymous = await request.newContext({ baseURL })
    opened.push(anonymous)
    const headers = { Authorization: `users API-Key ${fakeSecret()}` }
    const me = await anonymous.get('/api/users/me', { headers })
    expect(me.status()).toBe(200)
    expect(((await me.json()) as { user: unknown }).user).toBeNull()
    expect((await anonymous.get('/api/users?depth=0', { headers })).status()).toBe(403)
  })
})

test.describe('deleting accounts', () => {
  async function exists(email: string): Promise<boolean> {
    const response = await admin.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
    expect(response.status()).toBe(200)
    return ((await response.json()) as { totalDocs: number }).totalDocs === 1
  }

  test('an administrator cannot delete their own account', async () => {
    const account = await createStaff(admin, 'delete-self', ['administrator'])
    const self = await as(account)
    const { id } = await stored(account.email)
    const response = await self.delete(`/api/users/${id}`)
    expect([403, 404], `status ${response.status()}`).toContain(response.status())
    expect(await exists(account.email)).toBe(true)
  })

  test('a bulk delete that matches yourself deletes only the others', async () => {
    const account = await createStaff(admin, 'delete-bulk-self', ['administrator'])
    const other = await createStaff(admin, 'delete-bulk-other', ['editor'])
    const self = await as(account)
    const selfId = (await stored(account.email)).id
    const otherId = (await stored(other.email)).id
    const response = await self.delete(`/api/users?where[id][in][0]=${selfId}&where[id][in][1]=${otherId}&depth=0`)
    expect(response.status()).toBeLessThan(500)
    expect(await exists(account.email), 'the administrator who sent it').toBe(true)
    expect(await exists(other.email), 'the other account').toBe(false)
  })

  test('an administrator can delete another account; an editor cannot', async () => {
    const editorAccount = await createStaff(admin, 'delete-editor', ['editor'])
    const target = await createStaff(admin, 'delete-target', ['editor'])
    const editor = await as(editorAccount)
    const targetId = (await stored(target.email)).id
    expect([403, 404]).toContain((await editor.delete(`/api/users/${targetId}`)).status())
    expect(await exists(target.email)).toBe(true)
    expect((await admin.delete(`/api/users/${targetId}`)).status()).toBe(200)
    expect(await exists(target.email)).toBe(false)
  })
})

test.describe('sessions end when roles or the password change', () => {
  async function session(account: TestAccount): Promise<APIRequestContext> {
    const context = await request.newContext({ baseURL, extraHTTPHeaders: asUser(await signInToken(baseURL, account)) })
    opened.push(context)
    return context
  }

  async function signedIn(context: APIRequestContext): Promise<boolean> {
    const response = await context.get('/api/users/me')
    expect(response.status()).toBe(200)
    return ((await response.json()) as { user: unknown }).user !== null
  }

  test('a change of roles ends every session of that account', async () => {
    const account = await createStaff(admin, 'revoke-roles', ['editor'])
    const [first, second] = [await session(account), await session(account)]
    expect(await signedIn(first)).toBe(true)
    expect(await signedIn(second)).toBe(true)

    const { id } = await stored(account.email)
    expect((await admin.patch(`/api/users/${id}`, { data: { roles: ['publisher'] } })).status()).toBe(200)
    expect(await signedIn(first), 'first session after the role change').toBe(false)
    expect(await signedIn(second), 'second session after the role change').toBe(false)
    // The account itself still works: signing in again starts a new session with the new role.
    expect(await signedIn(await session(account))).toBe(true)
  })

  test('a change that leaves the roles as they were ends nothing', async () => {
    const account = await createStaff(admin, 'revoke-none', ['editor'])
    const context = await session(account)
    const { id } = await stored(account.email)
    expect((await admin.patch(`/api/users/${id}`, { data: { name: '[Test] renamed' } })).status()).toBe(200)
    expect((await admin.patch(`/api/users/${id}`, { data: { roles: ['editor'] } })).status()).toBe(200)
    expect(await signedIn(context)).toBe(true)
  })

  test('an administrator setting a new password ends every session of that account', async () => {
    const account = await createStaff(admin, 'revoke-password', ['editor'])
    const [first, second] = [await session(account), await session(account)]
    const { id } = await stored(account.email)
    const password = fakeSecret()
    expect((await admin.patch(`/api/users/${id}`, { data: { password } })).status()).toBe(200)
    expect(await signedIn(first)).toBe(false)
    expect(await signedIn(second)).toBe(false)
    expect((await attemptLogin(baseURL, account.email, password)).status).toBe(200)
  })

  test('changing your own password keeps this session and ends the others', async () => {
    const account = await createStaff(admin, 'revoke-own', ['editor'])
    const [current, other] = [await session(account), await session(account)]
    const { id } = await stored(account.email)
    expect((await current.patch(`/api/users/${id}`, { data: { password: fakeSecret() } })).status()).toBe(200)
    expect(await signedIn(current), 'the session that changed the password').toBe(true)
    expect(await signedIn(other), 'another session of the same account').toBe(false)
  })
})

test.describe('cross-site requests with the session cookie (CSRF)', () => {
  // The server runs with SITE_URL written as `${baseURL}/portal/` (playwright.db.config.ts), so
  // these also prove the origin is normalised. The cookie is sent by hand in a Cookie header, never
  // through a cookie jar, so the Secure flag on the production build plays no part.
  let account: TestAccount
  let token: string
  let id: string | number

  test.beforeAll(async () => {
    account = await createStaff(admin, 'csrf', ['editor'])
    token = await signInToken(baseURL, account)
    id = (await stored(account.email)).id
  })

  async function withCookie(headers: Record<string, string>): Promise<APIRequestContext> {
    const context = await request.newContext({ baseURL, extraHTTPHeaders: { Cookie: `${SESSION_COOKIE}=${token}`, ...headers } })
    opened.push(context)
    return context
  }

  async function signedInEmail(context: APIRequestContext): Promise<string | null> {
    const response = await context.get('/api/users/me')
    expect(response.status()).toBe(200)
    return ((await response.json()) as { user: { email: string } | null }).user?.email ?? null
  }

  test('the site\'s own origin is accepted, for reading and for changes', async () => {
    const sameOrigin = await withCookie({ Origin: baseURL })
    expect(await signedInEmail(sameOrigin)).toBe(account.email)
    const change = await sameOrigin.patch(`/api/users/${id}`, { data: { name: '[Test] csrf same-origin' } })
    expect(change.status()).toBe(200)
    expect((await stored(account.email)).name).toBe('[Test] csrf same-origin')
  })

  test('a browser request without Origin but marked same-origin is accepted', async () => {
    expect(await signedInEmail(await withCookie({ 'Sec-Fetch-Site': 'same-origin' }))).toBe(account.email)
  })

  test('another origin gets no session and cannot change anything', async () => {
    const foreign = await withCookie({ Origin: 'https://evil.example' })
    expect(await signedInEmail(foreign)).toBeNull()
    const before = (await stored(account.email)).name
    const change = await foreign.patch(`/api/users/${id}`, { data: { name: '[Test] csrf cross-site' } })
    expect(change.status()).toBe(403)
    expect((await stored(account.email)).name).toBe(before)
  })

  test('the origin written as SITE_URL (with its path and slash) is not what browsers send, and is refused', async () => {
    // Shows that only the normalised origin is on the list.
    expect(await signedInEmail(await withCookie({ Origin: `${baseURL}/portal/` }))).toBeNull()
  })

  test('a cross-site request without Origin gets no session', async () => {
    expect(await signedInEmail(await withCookie({ 'Sec-Fetch-Site': 'cross-site' }))).toBeNull()
  })

  test('a request with neither Origin nor Sec-Fetch-Site (not a browser) gets no session from the cookie', async () => {
    expect(await signedInEmail(await withCookie({}))).toBeNull()
  })
})

test.describe('failed sign-ins and lockout', () => {
  // Every failed sign-in must look the same from outside, whether the email is unknown, the
  // password is wrong, or the account is locked, so the reply never shows that an account exists.
  type Attempt = { label: string; status: number; body: string }

  async function fail(label: string, email: string, password: string): Promise<Attempt> {
    const { status, body } = await attemptLogin(baseURL, email, password)
    return { label, status, body }
  }

  /** Runs `pnpm auth:unlock` with DATABASE_URL set to the test database, for this process only. */
  async function runUnlock(args: string[]): Promise<{ code: number; output: string }> {
    const command = ['pnpm', 'auth:unlock', ...args.map((arg) => JSON.stringify(arg))].join(' ')
    const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' }
    try {
      const { stdout, stderr } = await exec(command, { env })
      return { code: 0, output: `${stdout}${stderr}` }
    } catch (error) {
      const failed = error as { code?: number; stdout?: string; stderr?: string }
      return { code: failed.code ?? 1, output: `${failed.stdout ?? ''}${failed.stderr ?? ''}` }
    }
  }

  async function lockOf(email: string): Promise<{ lockUntil: string | null; loginAttempts: number | null }> {
    return (await runTestDbScript('tests/support/read-lock.ts', [email])) as {
      lockUntil: string | null
      loginAttempts: number | null
    }
  }

  test('every failed sign-in gets the same status and exactly the same body', async () => {
    const account = await createStaff(admin, 'lockout-same', ['editor'])
    const attempts: Attempt[] = [await fail('unknown email', newAccount('nobody').email, fakeSecret())]
    for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) {
      attempts.push(await fail(`wrong password ${n}`, account.email, fakeSecret()))
    }
    attempts.push(await fail('locked, right password', account.email, account.password))
    attempts.push(await fail('locked, wrong password', account.email, fakeSecret()))
    attempts.push(await fail('unknown email after the lock', newAccount('nobody').email, fakeSecret()))

    const expected = JSON.stringify({ errors: [{ message: LOGIN_FAILED_MESSAGE }] })
    const shown = attempts.map(({ label, status, body }) => `${label}: ${status} ${body}`).join('\n')
    console.log(`[lockout] replies:\n${shown}`)
    for (const { label, status, body } of attempts) {
      expect(status, `${label}\n${shown}`).toBe(401)
      expect(body, `${label}\n${shown}`).toBe(expected)
    }
  })

  test('after 5 wrong passwords the right one is refused, for 15 minutes', async () => {
    test.setTimeout(120_000) // includes a `payload run` against the test database
    const account = await createStaff(admin, 'lockout-time', ['editor'])
    for (let n = 1; n < MAX_LOGIN_ATTEMPTS; n++) await attemptLogin(baseURL, account.email, fakeSecret())
    // Four failures do not lock: the right password still works (and resets the count).
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)

    for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) await attemptLogin(baseURL, account.email, fakeSecret())
    const lockedAt = Date.now()
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(401)

    const { lockUntil } = await lockOf(account.email)
    expect(lockUntil, 'the account is locked').not.toBeNull()
    const remaining = Date.parse(lockUntil!) - lockedAt
    expect(Math.abs(remaining - LOCK_MINUTES * 60 * 1000), `lock ends in ${Math.round(remaining / 1000)} s`).toBeLessThan(60_000)
  })

  test('only an administrator can unlock an account, and the right password then works', async () => {
    const account = await createStaff(admin, 'lockout-unlock', ['editor'])
    const editor = await as(await createStaff(admin, 'lockout-editor', ['editor']))
    for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) await attemptLogin(baseURL, account.email, fakeSecret())
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(401)

    const anonymous = await request.newContext({ baseURL })
    opened.push(anonymous)
    expect((await anonymous.post('/api/users/unlock', { data: { email: account.email } })).status()).toBe(403)
    expect((await editor.post('/api/users/unlock', { data: { email: account.email } })).status()).toBe(403)
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(401)

    expect((await admin.post('/api/users/unlock', { data: { email: account.email } })).status()).toBe(200)
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)
  })

  test('the emergency command pnpm auth:unlock unlocks an account; an unknown email changes nothing', async () => {
    test.setTimeout(300_000) // two `payload run` processes against the hosted test database
    const account = await createStaff(admin, 'lockout-cli', ['editor'])
    for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) await attemptLogin(baseURL, account.email, fakeSecret())
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(401)

    // Never run it until it has shown that it targets the test database.
    const testDatabase = describeDatabase(databaseIdentity(process.env.TEST_DATABASE_URL))
    const target = await runUnlock(['--show-target'])
    expect(target.code, target.output).toBe(0)
    expect(target.output, 'auth:unlock must target the test database').toContain(`Target: ${testDatabase}.`)

    const unlocked = await runUnlock([account.email.toUpperCase()])
    expect(unlocked.code, unlocked.output).toBe(0)
    expect(unlocked.output).toContain(`Confirmed: ${testDatabase}: account unlocked (it was locked`)
    expect(unlocked.output).not.toMatch(/postgres(ql)?:\/\//)
    expect((await attemptLogin(baseURL, account.email, account.password)).status).toBe(200)

    const unknown = await runUnlock([newAccount('nobody').email])
    expect(unknown.code, unknown.output).not.toBe(0)
    expect(unknown.output).toContain('No account with that email address')
    expect(unknown.output).not.toMatch(/postgres(ql)?:\/\//)
  })

  test('a sign-in with a missing password still says which field is missing', async () => {
    const anonymous = await request.newContext({ baseURL })
    opened.push(anonymous)
    const response = await anonymous.post('/api/users/login', { data: { email: newAccount('x').email } })
    expect(response.status()).toBe(400)
    expect(await response.text()).not.toContain(LOGIN_FAILED_MESSAGE)
  })
})

test.describe('error responses', () => {
  // A production server once answered with Payload's errors stripped of their name and details:
  // the instance serving requests had been created by another bundle's copy of Payload, so the
  // route's error formatting did not recognise its error classes (D-051, part 4).
  // Not asserted: errors[0].name. Payload sets it from the class name (this.constructor.name), and
  // the production build minifies class names, so it reads "A" there. A `name` is present only
  // when Payload recognised the error, and the details in `data` are what staff see.
  test('a validation error keeps the details of the field that failed', async () => {
    const response = await admin.post('/api/users', { data: { ...newAccount('error-format'), roles: ['superuser'] } })
    const body = await response.text()
    // Printed with every failure. It holds Payload's error only; the request's password is never echoed.
    const shown = `status ${response.status()}, body ${body}`
    console.log(`[error-format] ${shown}`)
    expect(response.status(), shown).toBe(400)
    const { errors } = JSON.parse(body) as {
      errors: { message?: string; data?: { errors?: { path?: string; message?: string }[] } }[]
    }
    const roles = errors[0]?.data?.errors?.find((error) => error.path === 'roles')
    expect(roles, shown).toBeDefined()
    expect(typeof roles?.message === 'string' && roles.message.length > 0, shown).toBe(true)
    expect(roles?.message, shown).not.toBe(errors[0]?.message)
  })
})

test.describe('email', () => {
  // The email field overrides only update access on Payload's built-in field (D-048); these check
  // that its lower-casing and uniqueness still apply when an administrator creates an account.
  test('an administrator creates an account; the email is stored lower-cased and signs in', async () => {
    const account = newAccount('Mixed-Case')
    const [local, domain] = account.email.split('@')
    const mixed = `${local!.toUpperCase()}@${domain!.replace('test.invalid', 'Test.Invalid')}`
    const response = await admin.post('/api/users', { data: { ...account, email: mixed, roles: ['editor'] } })
    expect(response.status(), await response.text()).toBe(201)

    const lower = mixed.toLowerCase()
    expect((await stored(lower)).email).toBe(lower)
    // Payload lower-cases the address at sign-in too, so both forms work.
    for (const email of [lower, mixed]) {
      const { status } = await attemptLogin(baseURL, email, account.password)
      expect(status, `sign-in as ${email}`).toBe(200)
    }
  })

  test('a second account with the same email, in any case, is refused', async () => {
    const account = await createStaff(admin, 'duplicate', ['editor'])
    for (const email of [account.email, account.email.toUpperCase()]) {
      const response = await admin.post('/api/users', {
        data: { ...newAccount('duplicate-again'), email, roles: ['editor'] },
      })
      expect(response.status(), `${email}: ${await response.text()}`).toBe(400)
    }
    const list = await admin.get(`/api/users?where[email][equals]=${encodeURIComponent(account.email)}&depth=0`)
    expect(((await list.json()) as { totalDocs: number }).totalDocs).toBe(1)
  })

  test('only an administrator can change an email address', async () => {
    const account = await createStaff(admin, 'email', ['publisher'])
    const publisher = await as(account)
    const { id } = await stored(account.email)

    await publisher.patch(`/api/users/${id}`, { data: { email: `changed-${account.email}` } })
    expect((await stored(account.email)).email).toBe(account.email)

    // What the admin panel uses to show the field read-only; the administrator's shows editable.
    expect(await canUpdateEmail(publisher)).toBe(false)
    expect(await canUpdateEmail(admin)).toBe(true)

    const newEmail = `renamed-${account.email}`
    expect((await admin.patch(`/api/users/${id}`, { data: { email: newEmail } })).status()).toBe(200)
    expect((await stored(newEmail)).id).toBe(id)
  })
})
