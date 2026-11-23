import { expect, test } from '@playwright/test'

import { contentAuditHooks } from '../../src/lib/audit/content-hooks'
import { auditFailedLogin, auditLogin, auditUserChange, noteLockBeforeLogin, notePasswordChange, uploadAuditHooks } from '../../src/lib/audit/hooks'
import { auditData, changedFields, DETAIL_KEYS, safeDetails } from '../../src/lib/audit/record'

// The audit log hooks with a fake Payload that records what would be written (D-083). The database
// tests check the same events through Payload itself (tests/e2e-db/audit-log.spec.ts).

// The address comes from the header named here, as on the server (D-081).
process.env.CLIENT_IP_HEADER = 'X-Forwarded-For'

type Written = { data: Record<string, unknown>; req?: unknown }

function fakeReq({ user, account, url = 'http://localhost:3000/api/users/login', data }: {
  user?: Record<string, unknown>
  account?: Record<string, unknown>
  url?: string
  data?: unknown
} = {}) {
  const written: Written[] = []
  const errors: unknown[] = []
  const req = {
    user,
    data,
    context: {} as Record<string, unknown>,
    url,
    method: 'POST',
    payloadAPI: 'REST',
    headers: new Headers({ 'user-agent': 'Test browser', 'x-forwarded-for': '203.0.113.9' }),
    payload: {
      config: { routes: { api: '/api' } },
      logger: { error: (message: unknown) => errors.push(message) },
      create: async (args: Written) => void written.push(args),
      find: async () => ({ docs: account ? [account] : [] }),
    },
  }
  return { req: req as never, written, errors, raw: req }
}

const ROW_KEYS = ['action', 'actor', 'actorEmail', 'targetType', 'targetId', 'targetLabel', 'ipAddress', 'userAgent', 'details']

test.describe('what can be written', () => {
  test('details keep only allowed keys, and only strings or lists of strings', () => {
    const details = safeDetails({
      fields: ['email', 3, { x: 1 }],
      reason: 'wrong password',
      password: 'secret',
      hash: 'abc',
      token: 'xyz',
      from: ['editor'],
      to: { nested: true },
    })
    expect(details).toEqual({ fields: ['email'], reason: 'wrong password', from: ['editor'] })
    expect(Object.keys(details!).every((key) => (DETAIL_KEYS as readonly string[]).includes(key))).toBe(true)
    expect(safeDetails({ password: 'x' })).toBeUndefined()
  })

  test('a row has exactly the audit fields, with the address and browser from the request', () => {
    const { req } = fakeReq()
    const row = auditData(req, {
      action: 'login.failed',
      actor: { id: '7', email: 'a@example.org' },
      target: { type: 'user', id: 7, label: 'a@example.org' },
      details: { reason: 'wrong password', hash: 'never' },
    })
    expect(Object.keys(row).sort()).toEqual([...ROW_KEYS].sort())
    expect(row).toMatchObject({ actor: 7, ipAddress: '203.0.113.9', userAgent: 'Test browser', details: { reason: 'wrong password' } })
  })

  test('long text is cut to 320 characters; a non-numeric actor id is not linked', () => {
    const { req } = fakeReq()
    const row = auditData(req, { action: 'logout', actor: { id: 'abc', email: 'x'.repeat(400) } })
    expect(row.actor).toBeNull()
    expect(row.actorEmail).toHaveLength(320)
  })

  test('changedFields lists only listed fields that differ', () => {
    const before = { email: 'a@example.org', name: 'A', roles: ['editor'], hash: 'h1' }
    const after = { email: 'a@example.org', name: 'B', roles: ['editor', 'publisher'], hash: 'h2' }
    expect(changedFields(['email', 'name', 'roles'], before, after)).toEqual(['name', 'roles'])
  })
})

test.describe('account events', () => {
  const doc = { id: 5, email: 'kemi@example.org', roles: ['editor'] }
  const admin = { id: 1, email: 'admin@example.org', collection: 'users' }
  /** As Payload runs it: beforeValidate sees the password, then afterChange runs without it. */
  const change = (args: Record<string, unknown>, user: Record<string, unknown> | undefined = admin) => {
    const fake = fakeReq({ user })
    const all = { data: {}, doc, previousDoc: doc, operation: 'update', ...args, req: fake.req }
    notePasswordChange(all as never)
    const { password: _hashedAway, ...data } = all.data as Record<string, unknown>
    return { ...fake, run: auditUserChange({ ...all, data } as never) }
  }

  test('a new account records who created it and its roles, in the request transaction', async () => {
    const { run, written, raw } = change({ operation: 'create', previousDoc: undefined })
    await run
    expect(written.map((w) => w.data.action)).toEqual(['user.created'])
    expect(written[0]!.data).toMatchObject({ actor: 1, actorEmail: 'admin@example.org', targetId: '5', details: { roles: ['editor'] } })
    expect(written[0]!.req).toBe(raw)
  })

  test('roles, other fields and a password are separate entries, with names only', async () => {
    const { run, written } = change({
      data: { password: 'never-written', name: 'New' },
      doc: { ...doc, name: 'New', roles: ['publisher'] },
    })
    await run
    expect(written.map((w) => [w.data.action, w.data.details])).toEqual([
      ['user.roles-changed', { from: ['editor'], to: ['publisher'] }],
      ['user.updated', { fields: ['name'] }],
      ['password.changed', { via: 'set by another account' }],
    ])
    expect(JSON.stringify(written)).not.toContain('never-written')
  })

  test('a save that changes no listed field (a reset token, a session) leaves no entry', async () => {
    const { run, written } = change({ data: { resetPasswordToken: 'abc' }, doc: { ...doc, resetPasswordToken: 'abc' } })
    await run
    expect(written).toEqual([])
  })

  test('changing your own password says so', async () => {
    const { run, written } = change({ data: { password: 'x' } }, { id: 5, email: doc.email, collection: 'users' })
    await run
    expect(written.map((w) => w.data.details)).toEqual([{ via: 'own account' }])
  })

  test('a sign-in is recorded only from the login endpoint, not from a reset link', async () => {
    for (const [url, count] of [
      ['http://localhost:3000/api/users/login', 1],
      ['http://localhost:3000/api/users/reset-password', 0],
    ] as const) {
      const { req, written } = fakeReq({ url })
      await auditLogin({ req, user: doc, token: 't' } as never)
      expect(written, url).toHaveLength(count)
    }
  })
})

test.describe('refused sign-ins', () => {
  const minutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString()
  const account = { id: 5, email: 'kemi@example.org' }
  /** One sign-in: the lock state before (read by noteLockBeforeLogin), then the refusal with the state after. */
  const refuse = async (status: number, before?: Record<string, unknown>, after = before, email = 'Kemi@Example.org') => {
    const fake = fakeReq({ account: before, data: { email, password: 'never-written' } })
    await noteLockBeforeLogin({ args: { data: { email } }, operation: 'login', req: fake.req } as never)
    fake.raw.payload.find = async () => ({ docs: after ? [after] : [] })
    await auditFailedLogin({ collection: { slug: 'users' }, error: { status }, req: fake.req } as never)
    return fake
  }
  const summary = (written: Written[]) => written.map((w) => [w.data.action, w.data.targetLabel, w.data.details])

  test('an unknown email is recorded without what was typed', async () => {
    const { written } = await refuse(401, undefined, undefined, 'my-password-by-mistake')
    expect(summary(written)).toEqual([['login.failed', null, { reason: 'unknown account' }]])
    expect(JSON.stringify(written)).not.toContain('my-password-by-mistake')
  })

  test('a wrong password, the one that locks, and one while locked', async () => {
    const open = { ...account, lockUntil: null }
    const locked = { ...account, lockUntil: minutes(15) }
    expect(summary((await refuse(401, open, open)).written)).toEqual([['login.failed', 'kemi@example.org', { reason: 'wrong password' }]])
    expect(summary((await refuse(401, open, locked)).written)).toEqual([
      ['login.failed', 'kemi@example.org', { reason: 'wrong password' }],
      ['account.locked', 'kemi@example.org', null],
    ])
    // Moments after the lock: still "already locked", never a second lock entry.
    expect(summary((await refuse(401, locked, locked)).written)).toEqual([['login.failed', 'kemi@example.org', { reason: 'account locked' }]])
  })

  test('a lock that has ended counts as open', async () => {
    const ended = { ...account, lockUntil: minutes(-1) }
    expect(summary((await refuse(401, ended, ended)).written)).toEqual([['login.failed', 'kemi@example.org', { reason: 'wrong password' }]])
  })

  test('a rate-limited sign-in is recorded; entries are written on their own, never with a password', async () => {
    const { written } = await refuse(429, account)
    expect(summary(written)).toEqual([['login.limited', 'kemi@example.org', null]])
    expect(written[0]!.req).toBeUndefined()
    expect(JSON.stringify(written)).not.toContain('never-written')
  })

  test('other errors and other endpoints leave no entry; a write failure is logged with fixed text', async () => {
    expect((await refuse(400)).written).toEqual([])
    const fake = fakeReq({ data: { email: 'a@example.org' } })
    fake.raw.payload.create = async () => {
      throw new Error('connection lost')
    }
    await auditFailedLogin({ collection: { slug: 'users' }, error: { status: 401 }, req: fake.req } as never)
    expect(fake.errors).toEqual(['Audit log: a login.failed entry could not be written.'])
  })
})

test('images: upload, change (field names only) and delete', async () => {
  const hooks = uploadAuditHooks('media')
  const image = { id: 9, filename: 'office.webp', alt: 'Office' }
  const { req, written } = fakeReq({ user: { id: 1, email: 'a@example.org', collection: 'users' } })
  await hooks.afterChange({ doc: image, operation: 'create', req } as never)
  await hooks.afterChange({ doc: { ...image, alt: 'New' }, previousDoc: image, operation: 'update', req } as never)
  await hooks.afterChange({ doc: image, previousDoc: image, operation: 'update', req } as never)
  await hooks.afterDelete({ doc: image, req } as never)
  expect(written.map((w) => [w.data.action, w.data.targetLabel, w.data.details])).toEqual([
    ['media.created', 'office.webp', null],
    ['media.updated', 'office.webp', { fields: ['alt'] }],
    ['media.deleted', 'office.webp', null],
  ])
})

test('document files: upload, change (field names only) and delete', async () => {
  const hooks = uploadAuditHooks('document-files')
  const doc = { id: 4, filename: 'order.pdf', title: 'Order' }
  const { req, written } = fakeReq({ user: { id: 1, email: 'a@example.org', collection: 'users' } })
  await hooks.afterChange({ doc, operation: 'create', req } as never)
  await hooks.afterChange({ doc: { ...doc, title: 'Order 1' }, previousDoc: doc, operation: 'update', req } as never)
  await hooks.afterDelete({ doc, req } as never)
  expect(written.map((w) => [w.data.action, w.data.targetType, w.data.targetLabel, w.data.details])).toEqual([
    ['file.uploaded', 'document-files', 'order.pdf', null],
    ['file.updated', 'document-files', 'order.pdf', { fields: ['title'] }],
    ['file.deleted', 'document-files', 'order.pdf', null],
  ])
})

test.describe('content items (D-090)', () => {
  const hooks = contentAuditHooks('e2e-drafts', ['title', 'summary', 'updatedAt', '_status'])
  const published = { id: 7, title: 'Notice', summary: 'A', _status: 'published' }
  const draft = { ...published, _status: 'draft' }

  /** Runs one save through both hooks, as Payload does, and returns what was written. */
  async function save(args: { autosave?: boolean; draft?: boolean }, operation: 'create' | 'update', doc: unknown, previousDoc?: unknown) {
    const { req, written } = fakeReq({ user: { id: 1, email: 'a@example.org', collection: 'users' } })
    hooks.noteSaveKind({ args, operation, req } as never)
    await hooks.afterChange({ doc, previousDoc, operation, req } as never)
    return written.map((w) => [w.data.action, w.data.targetLabel, w.data.details])
  }

  test('created as a draft, or published straight away', async () => {
    expect(await save({ draft: true }, 'create', draft)).toEqual([['content.created', 'Notice', null]])
    expect(await save({}, 'create', published)).toEqual([['content.published', 'Notice', null]])
  })

  test('draft saved, published and unpublished, with the changed field names only', async () => {
    expect(await save({ draft: true }, 'update', { ...draft, summary: 'B' }, published)).toEqual([
      ['content.draft-saved', 'Notice', { fields: ['summary'] }],
    ])
    expect(await save({}, 'update', { ...published, summary: 'B' }, draft)).toEqual([['content.published', 'Notice', { fields: ['summary'] }]])
    expect(await save({}, 'update', draft, published)).toEqual([['content.unpublished', 'Notice', null]])
  })

  test('autosaves leave no entry (version history keeps them)', async () => {
    expect(await save({ autosave: true, draft: true }, 'update', { ...draft, summary: 'typing' }, published)).toEqual([])
  })

  test('deleted', async () => {
    const { req, written } = fakeReq({ user: { id: 1, email: 'a@example.org', collection: 'users' } })
    await hooks.afterDelete({ doc: published, req } as never)
    expect(written.map((w) => [w.data.action, w.data.targetType, w.data.targetId])).toEqual([['content.deleted', 'e2e-drafts', '7']])
  })
})
