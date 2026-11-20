import { type APIRequestContext, expect, test } from '@playwright/test'

import { createStaff, loadAdminAccount, signInOnce, type TestAccount } from './support/auth'
import { runTestDbScript } from './support/db-script'

// At least one administrator must always remain (Step 3 plan, D-052): checked once per operation,
// over all its targets, under a Postgres advisory lock (src/lib/auth/last-administrator.ts).
// Runs as the LAST project (playwright.db.config.ts): its first step demotes the run's
// administrator so that exactly one administrator is left, which no other test expects.
test.describe.configure({ mode: 'serial' })

type User = { id: string | number; email: string }

let baseURL: string
let survivor: TestAccount
const opened: APIRequestContext[] = []

async function as(account: TestAccount): Promise<APIRequestContext> {
  // The same administrators sign in many times here, faster than 2FA codes come (D-084).
  const context = await signInOnce(baseURL, account)
  opened.push(context)
  return context
}

async function idOf(context: APIRequestContext, email: string): Promise<User['id']> {
  const response = await context.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
  expect(response.status()).toBe(200)
  const { docs } = (await response.json()) as { docs: User[] }
  expect(docs, `no account ${email}`).toHaveLength(1)
  return docs[0]!.id
}

/** Emails of every administrator, read by an administrator. */
async function administrators(context: APIRequestContext): Promise<string[]> {
  const response = await context.get('/api/users?where[roles][in][0]=administrator&limit=100&depth=0')
  expect(response.status()).toBe(200)
  return ((await response.json()) as { docs: User[] }).docs.map((user) => user.email).sort()
}

async function exists(context: APIRequestContext, email: string): Promise<boolean> {
  const response = await context.get(`/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0`)
  return ((await response.json()) as { totalDocs: number }).totalDocs === 1
}

type ProbeResult = { mode: string; before: string[]; after: string[]; refused: boolean; status?: number; errors?: number }

async function probe(mode: string, caller: TestAccount): Promise<ProbeResult> {
  const result = (await runTestDbScript('tests/support/last-admin-probe.ts', [mode, caller.email])) as ProbeResult
  console.log(`[last-admin] ${JSON.stringify({ ...result, before: result.before.length, after: result.after.length })}`)
  return result
}

test.beforeAll(({ baseURL: url }) => {
  baseURL = url!
})

test.afterAll(async () => {
  await Promise.all(opened.map((context) => context.dispose()))
})

test('setup: every other administrator is demoted, leaving exactly one', async () => {
  const first = await as(await loadAdminAccount())
  survivor = await createStaff(first, 'last-a', ['administrator'])
  const a = await as(survivor)
  // The run's administrator and any administrators earlier projects created, one at a time by id
  // (the bulk path is tested below).
  for (const email of await administrators(a)) {
    if (email === survivor.email) continue
    const response = await a.patch(`/api/users/${await idOf(a, email)}`, { data: { roles: ['editor'] } })
    expect(response.status(), `${email}: ${await response.text()}`).toBe(200)
  }
  expect(await administrators(a)).toEqual([survivor.email])
})

test('two administrators demoting each other at the same moment leave exactly one (5 rounds)', async () => {
  test.setTimeout(300_000)
  for (let round = 1; round <= 5; round++) {
    const s = await as(survivor)
    const partner = await createStaff(s, `last-demote-${round}`, ['administrator'])
    const p = await as(partner)
    const [sId, pId] = [await idOf(s, survivor.email), await idOf(s, partner.email)]

    const [bySurvivor, byPartner] = await Promise.all([
      s.patch(`/api/users/${pId}`, { data: { roles: ['editor'] } }),
      p.patch(`/api/users/${sId}`, { data: { roles: ['editor'] } }),
    ])
    const statuses = [bySurvivor.status(), byPartner.status()]
    console.log(`[last-admin] demote round ${round}: survivor's request ${statuses[0]}, partner's ${statuses[1]}`)
    expect([...statuses].sort(), `round ${round}`).toEqual([200, 409])

    survivor = bySurvivor.status() === 200 ? survivor : partner
    expect(await administrators(await as(survivor)), `round ${round}`).toEqual([survivor.email])
  }
})

test('two administrators deleting each other at the same moment leave exactly one (5 rounds)', async () => {
  test.setTimeout(300_000)
  for (let round = 1; round <= 5; round++) {
    const s = await as(survivor)
    const partner = await createStaff(s, `last-delete-${round}`, ['administrator'])
    const p = await as(partner)
    const [sId, pId] = [await idOf(s, survivor.email), await idOf(s, partner.email)]

    const [bySurvivor, byPartner] = await Promise.all([s.delete(`/api/users/${pId}`), p.delete(`/api/users/${sId}`)])
    const statuses = [bySurvivor.status(), byPartner.status()]
    console.log(`[last-admin] delete round ${round}: survivor's request ${statuses[0]}, partner's ${statuses[1]}`)
    expect([...statuses].sort(), `round ${round}`).toEqual([200, 409])

    survivor = bySurvivor.status() === 200 ? survivor : partner
    const left = await as(survivor)
    expect(await administrators(left), `round ${round}`).toEqual([survivor.email])
  }
})

test('a REST bulk demote matching every administrator leaves exactly the one who sent it', async () => {
  const c = await as(survivor)
  const others = [await createStaff(c, 'last-bulk-x', ['administrator']), await createStaff(c, 'last-bulk-y', ['administrator'])]
  expect(await administrators(c)).toHaveLength(3)
  const response = await c.patch('/api/users?where[roles][in][0]=administrator&depth=0', { data: { roles: ['editor'] } })
  expect(response.status(), await response.text()).toBe(200)
  expect(await administrators(c)).toEqual([survivor.email])
  for (const other of others) expect(await exists(c, other.email), other.email).toBe(true)
})

test('a REST bulk delete matching every administrator leaves exactly the one who sent it', async () => {
  const c = await as(survivor)
  const others = [await createStaff(c, 'last-bulkdel-x', ['administrator']), await createStaff(c, 'last-bulkdel-y', ['administrator'])]
  const response = await c.delete('/api/users?where[roles][in][0]=administrator&depth=0')
  expect(response.status()).toBeLessThan(500)
  expect(await administrators(c)).toEqual([survivor.email])
  for (const other of others) expect(await exists(c, other.email), other.email).toBe(false)
})

test('the Local API with a user, matching every administrator, leaves exactly that user', async () => {
  test.setTimeout(300_000) // two `payload run` processes against the test database
  const c = await as(survivor)
  for (const label of ['last-local-x', 'last-local-y']) await createStaff(c, label, ['administrator'])
  const demoted = await probe('demote-as-user', survivor)
  expect(demoted.before).toHaveLength(3)
  expect(demoted.refused).toBe(false)
  expect(demoted.after).toEqual([survivor.email])

  for (const label of ['last-localdel-x', 'last-localdel-y']) await createStaff(c, label, ['administrator'])
  const deleted = await probe('delete-as-user', survivor)
  expect(deleted.before).toHaveLength(3)
  expect(deleted.refused).toBe(false)
  expect(deleted.after).toEqual([survivor.email])
})

test('trusted code (overrideAccess) removing every administrator is refused whole; nothing changes', async () => {
  test.setTimeout(300_000) // two `payload run` processes against the test database
  const c = await as(survivor)
  await createStaff(c, 'last-trusted-x', ['administrator'])
  for (const mode of ['demote-trusted', 'delete-trusted']) {
    const result = await probe(mode, survivor)
    expect(result.before, mode).toHaveLength(2)
    expect(result.refused, mode).toBe(true)
    expect(result.status, mode).toBe(409)
    expect(result.after, mode).toEqual(result.before)
  }
})
