import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { attemptLogin, createStaff, loadAdminAccount, newAccount, signIn, signInToken, type TestAccount } from './support/auth'
import { fakeSecret } from '../support/fakes'
import { runTestDbScript } from './support/db-script'

// Staff accounts: who may change roles, emails and Payload's internal auth fields (SRS Section 10,
// FR-CMS-05/06, NFR-SEC-02). Every check reads the stored record back as an administrator, because
// Payload drops a field that access denies without an error.
test.describe.configure({ mode: 'serial' })

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

    // Same token: an editor sees only their own account and cannot create users.
    const after = await demoted.get('/api/users?depth=0')
    expect(((await after.json()) as { totalDocs: number }).totalDocs).toBe(1)
    const create = await demoted.post('/api/users', { data: { ...newAccount('y'), roles: ['editor'] } })
    expect(create.status()).toBe(403)
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

test.describe('email', () => {
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
