import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { type APIRequestContext, expect, request, test } from '@playwright/test'
import sharp from 'sharp'

import { MAX_LOGIN_ATTEMPTS } from '../../src/lib/auth/generic-login-error'
import { asUser, createStaff, loadAdminAccount, sessionCookie, signIn, type TestAccount, visitorAddress } from './support/auth'
import { runTestDbScript } from './support/db-script'

// The audit log through Payload's REST pipeline, on the running server (D-083): each event, who can
// read it, that nobody can change it, that no secret reaches it, and the retention SQL. Passwords
// and tokens are random at run time; none is printed.
test.describe.configure({ mode: 'serial' })

type Entry = {
  action: string
  actorEmail?: string | null
  targetLabel?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  details?: Record<string, unknown> | null
}

let baseURL: string
let admin: APIRequestContext
let adminAccount: TestAccount
const opened: APIRequestContext[] = []
/** Every password and token used here, to check that none ever reaches the log. */
const secrets: string[] = []

const address = () => `10.${[...randomBytes(3)].join('.')}`
const wrong = () => {
  const password = randomBytes(18).toString('base64url')
  secrets.push(password)
  return password
}

async function from(ip: string, headers: Record<string, string> = {}): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL, extraHTTPHeaders: { ...visitorAddress(ip), ...headers } })
  opened.push(context)
  return context
}

async function staff(label: string, roles: string[] = ['editor']): Promise<TestAccount> {
  const account = await createStaff(admin, label, roles)
  secrets.push(account.password)
  return account
}

/** Entries about one account or image, oldest first, read as the administrator. */
async function entriesFor(label: string): Promise<Entry[]> {
  const response = await admin.get(`/api/audit-log?where[targetLabel][equals]=${encodeURIComponent(label)}&sort=createdAt&limit=100&depth=0`)
  expect(response.status(), (await response.text()).slice(0, 300)).toBe(200)
  // Two-factor events (D-084) have their own tests; these lists are about everything else.
  return ((await response.json()) as { docs: Entry[] }).docs.filter((entry) => !entry.action.startsWith('2fa.'))
}


test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  adminAccount = await loadAdminAccount()
  admin = await signIn(baseURL, adminAccount)
  opened.push(admin)
})

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.dispose()))
})

test('sign-in, failures, the lock and sign-out are recorded, with the address and browser', async () => {
  const account = await staff('audit-login')
  const ip = address()
  const visitor = await from(ip, { 'User-Agent': 'OGSERC audit test browser' })
  const signedIn = await visitor.post('/api/users/login', { data: { email: account.email, password: account.password } })
  expect(signedIn.status()).toBe(200)
  const token = sessionCookie(signedIn.headersArray())?.value
  expect(token, 'session token').toBeTruthy()
  secrets.push(token!)
  const session = await request.newContext({ baseURL, extraHTTPHeaders: { ...asUser(token!), ...visitorAddress(ip) } })
  opened.push(session)
  expect((await session.post('/api/users/logout')).status()).toBe(200)
  for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) {
    expect((await (await from(address())).post('/api/users/login', { data: { email: account.email, password: wrong() } })).status()).toBe(401)
  }
  // One more while locked, with the right password.
  await (await from(address())).post('/api/users/login', { data: { email: account.email, password: account.password } })

  const entries = await entriesFor(account.email)
  expect(entries.map((entry) => [entry.action, entry.details?.reason])).toEqual([
    ['user.created', undefined],
    ['login.succeeded', undefined],
    ['logout', undefined],
    ...Array.from({ length: MAX_LOGIN_ATTEMPTS }, () => ['login.failed', 'wrong password']),
    ['account.locked', undefined],
    ['login.failed', 'account locked'],
  ])
  expect(entries[1]).toMatchObject({ actorEmail: account.email, ipAddress: ip, userAgent: 'OGSERC audit test browser' })
})

test('a sign-in with an unknown email is recorded without what was typed', async () => {
  const typed = `typed-${randomBytes(6).toString('hex')}@test.invalid`
  const ip = address()
  expect((await (await from(ip)).post('/api/users/login', { data: { email: typed, password: wrong() } })).status()).toBe(401)
  const response = await admin.get(`/api/audit-log?where[ipAddress][equals]=${ip}&depth=0`)
  const docs = ((await response.json()) as { docs: Entry[] }).docs
  expect(docs.map((entry) => [entry.action, entry.targetLabel, entry.details])).toEqual([['login.failed', null, { reason: 'unknown account' }]])
  expect(JSON.stringify(docs)).not.toContain(typed)
})

test('account changes record who did them, and field names, roles and reasons only', async () => {
  const account = await staff('audit-change')
  const id = (((await (await admin.get(`/api/users?where[email][equals]=${encodeURIComponent(account.email)}`)).json()) as { docs: { id: number }[] }).docs[0]!).id
  expect((await admin.patch(`/api/users/${id}`, { data: { roles: ['publisher'] } })).status()).toBe(200)
  expect((await admin.patch(`/api/users/${id}`, { data: { name: '[Test] renamed' } })).status()).toBe(200)
  const password = randomBytes(18).toString('hex')
  secrets.push(password)
  expect((await admin.patch(`/api/users/${id}`, { data: { password } })).status()).toBe(200)
  expect((await admin.delete(`/api/users/${id}`)).status()).toBe(200)

  const entries = await entriesFor(account.email)
  expect(entries.map((entry) => [entry.action, entry.actorEmail, entry.details])).toEqual([
    ['user.created', adminAccount.email, { roles: ['editor'] }],
    ['user.roles-changed', adminAccount.email, { from: ['editor'], to: ['publisher'] }],
    ['user.updated', adminAccount.email, { fields: ['name'] }],
    ['password.changed', adminAccount.email, { via: 'set by another account' }],
    ['user.deleted', adminAccount.email, null],
  ])
})

test('a reset link request and its use, and an unlock, are recorded', async () => {
  const account = await staff('audit-reset')
  expect((await (await from(address())).post('/api/users/forgot-password', { data: { email: account.email } })).status()).toBe(200)
  const { token } = (await runTestDbScript('tests/support/password-probe.ts', ['issue-token', account.email])) as { token: string }
  secrets.push(token)
  const password = randomBytes(18).toString('hex')
  secrets.push(password)
  expect((await (await from(address())).post('/api/users/reset-password', { data: { token, password } })).status()).toBe(200)
  for (let n = 1; n <= MAX_LOGIN_ATTEMPTS; n++) {
    await (await from(address())).post('/api/users/login', { data: { email: account.email, password: wrong() } })
  }
  expect((await admin.post('/api/users/unlock', { data: { email: account.email } })).status()).toBe(200)

  const entries = await entriesFor(account.email)
  const seen = entries.map((entry) => entry.action)
  // Two reset requests: the forgot-password form, then the token the test issues itself.
  expect(seen.filter((action) => action === 'password.reset-requested')).toHaveLength(2)
  expect(seen).toContain('password.reset-completed')
  expect(seen).not.toContain('login.succeeded')
  const unlock = entries.find((entry) => entry.action === 'account.unlocked')
  expect(unlock).toMatchObject({ actorEmail: adminAccount.email, details: { via: 'admin panel or API' } })
})

test('images: upload, change and delete are recorded with the file name', async () => {
  const editor = await signIn(baseURL, await staff('audit-media', ['publisher']))
  opened.push(editor)
  const name = `audit-${randomBytes(4).toString('hex')}.png`
  const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#1D7248' } }).png().toBuffer()
  const created = await editor.post('/api/media', {
    multipart: { file: { name, mimeType: 'image/png', buffer }, _payload: JSON.stringify({ alt: '[Test] image' }) },
  })
  expect(created.status(), (await created.text()).slice(0, 300)).toBe(201)
  const { doc } = (await created.json()) as { doc: { id: number; filename: string } }
  expect((await editor.patch(`/api/media/${doc.id}`, { data: { alt: '[Test] new text' } })).status()).toBe(200)
  expect((await editor.delete(`/api/media/${doc.id}`)).status()).toBe(200)
  expect((await entriesFor(doc.filename)).map((entry) => [entry.action, entry.details])).toEqual([
    ['media.created', null],
    ['media.updated', { fields: ['alt'] }],
    ['media.deleted', null],
  ])
})

test('only administrators can read the log, and nobody can create, change or delete entries', async () => {
  const editor = await signIn(baseURL, await staff('audit-reader', ['publisher']))
  opened.push(editor)
  expect((await editor.get('/api/audit-log')).status()).toBe(403)
  expect((await (await from(address())).get('/api/audit-log')).status()).toBe(403)

  const [entry] = ((await (await admin.get('/api/audit-log?limit=1&depth=0')).json()) as { docs: { id: number }[] }).docs
  expect(entry, 'the log has entries').toBeDefined()
  for (const response of [
    await admin.post('/api/audit-log', { data: { action: 'logout' } }),
    await admin.patch(`/api/audit-log/${entry!.id}`, { data: { action: 'logout' } }),
    await admin.delete(`/api/audit-log/${entry!.id}`),
    await admin.delete('/api/audit-log?where[id][exists]=true'),
  ]) {
    expect(response.status(), (await response.text()).slice(0, 200)).toBe(403)
  }
})

test('no password or token used in these tests appears anywhere in the log', async () => {
  const response = await admin.get('/api/audit-log?limit=1000&depth=0')
  const text = await response.text()
  expect(secrets.length).toBeGreaterThan(10)
  for (const secret of secrets) expect(text.includes(secret), 'a secret reached the audit log').toBe(false)
  expect(text).not.toMatch(/"(hash|salt|password|token|resetPasswordToken)"/)
})

// --- Retention (deploy/prune-audit.sql) --------------------------------------------------------

/** psql against the test database, with the connection in PG* variables, never on a command line. */
function psql(input: string, variables: Record<string, string>): { status: number | null; output: string } {
  const url = new URL(process.env.TEST_DATABASE_URL ?? '')
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1),
    ...(url.searchParams.get('sslmode') ? { PGSSLMODE: url.searchParams.get('sslmode')! } : {}),
  }
  const args = ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', ...Object.entries(variables).flatMap(([k, v]) => ['-v', `${k}=${v}`])]
  const result = spawnSync('psql', args, { input, env, encoding: 'utf8' })
  return { status: result.error ? null : result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` }
}

test('the retention SQL blanks addresses after 90 days and deletes entries after 2 years; a dry run changes nothing', async () => {
  const available = spawnSync('psql', ['--version']).status === 0
  // CI always has psql; a developer machine may not.
  test.skip(!available && !process.env.CI, 'psql is not installed')
  const marker = `retention-${randomBytes(6).toString('hex')}`
  const vars = { marker, ip_days: '90', keep_days: '730' }
  const insert = `
    INSERT INTO public.audit_log (action, target_label, ip_address, user_agent, created_at, updated_at) VALUES
      ('logout', :'marker' || '-recent', '10.0.0.1', 'ua', now() - interval '10 days', now()),
      ('logout', :'marker' || '-old', '10.0.0.2', 'ua', now() - interval '100 days', now()),
      ('logout', :'marker' || '-expired', '10.0.0.3', 'ua', now() - interval '800 days', now());`
  const read = `SELECT target_label || ':' || coalesce(ip_address, '-') || ':' || coalesce(user_agent, '-')
    FROM public.audit_log WHERE target_label LIKE :'marker' || '-%' ORDER BY created_at DESC;`
  const prune = readFileSync('deploy/prune-audit.sql', 'utf8')
  const rows = () => psql(read, vars).output.trim().split('\n')

  expect(psql(insert, vars).status).toBe(0)
  const all = [`${marker}-recent:10.0.0.1:ua`, `${marker}-old:10.0.0.2:ua`, `${marker}-expired:10.0.0.3:ua`]
  expect(rows()).toEqual(all)

  const dryRun = psql(`BEGIN;\n${prune}\nROLLBACK;`, vars)
  expect(dryRun.status, dryRun.output).toBe(0)
  expect(rows()).toEqual(all)

  const run = psql(`BEGIN;\n${prune}\nCOMMIT;`, vars)
  expect(run.status, run.output).toBe(0)
  expect(rows()).toEqual([`${marker}-recent:10.0.0.1:ua`, `${marker}-old:-:-`])

  psql(`DELETE FROM public.audit_log WHERE target_label LIKE :'marker' || '-%';`, vars)
})
