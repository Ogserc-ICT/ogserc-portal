import { randomBytes } from 'node:crypto'

import { type APIRequestContext, type BrowserContext, expect, request, test } from '@playwright/test'

import { pdf } from '../support/zip'
import {
  createStaff,
  loadAdminAccount,
  SESSION_COOKIE,
  signIn,
  signInToken,
  TOTP_COOKIE,
  type TestAccount,
  verifiedCookieFor,
  visitorAddress,
} from './support/auth'

// The Documents collection (FR-DOC-02, D-091), the first real content collection, over HTTP on the
// running server: the draft rules of D-049 (a draft is never public, editors cannot publish), and
// in a real browser, work typed into the admin panel surviving a sign-out (D-089).
test.describe.configure({ mode: 'serial' })

let baseURL: string
let admin: APIRequestContext
let editor: APIRequestContext
let publisher: APIRequestContext
let visitor: APIRequestContext
let editorAccount: TestAccount
let fileId: number | string

type Doc = { id: number | string; title: string; _status: string; slug: string }

const unique = () => randomBytes(4).toString('hex')
const fields = (title: string) => ({
  title,
  category: 'orders-and-directives',
  reference: `[Test] REF/${unique()}`,
  publicationDate: '2026-11-23T00:00:00.000Z',
  description: '[Test] description',
  file: fileId,
})

/** What a visitor sees: the document's title, or null when it is not visible. */
async function publicTitle(id: number | string): Promise<string | null> {
  const response = await visitor.get(`/api/documents/${id}?depth=0`)
  if (response.status() === 404 || response.status() === 403) return null
  expect(response.status()).toBe(200)
  return ((await response.json()) as Doc).title
}

test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  admin = await signIn(baseURL, await loadAdminAccount())
  editorAccount = await createStaff(admin, 'documents-editor', ['editor'])
  editor = await signIn(baseURL, editorAccount)
  publisher = await signIn(baseURL, await createStaff(admin, 'documents-publisher', ['publisher']))
  visitor = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  const upload = await editor.post('/api/document-files', {
    multipart: { file: { name: `${unique()}-order.pdf`, mimeType: 'application/pdf', buffer: pdf() }, _payload: JSON.stringify({ title: '[Test] order' }) },
  })
  expect(upload.status()).toBe(201)
  fileId = ((await upload.json()) as { doc: { id: number | string } }).doc.id
})

test.afterAll(async () => {
  await Promise.all([admin, editor, publisher, visitor].map((context) => context?.dispose()))
})

test.describe('draft rules on a real collection (D-049)', () => {
  let doc: Doc

  test('an editor creates a draft, with a web address made from the title; the public cannot see it', async () => {
    const response = await editor.post('/api/documents?draft=true&depth=0', { data: fields('[Test] Order on Testing, 2026') })
    expect(response.status()).toBe(201)
    doc = ((await response.json()) as { doc: Doc }).doc
    expect(doc._status).toBe('draft')
    expect(doc.slug).toBe('test-order-on-testing-2026')
    expect(await publicTitle(doc.id)).toBeNull()
    const list = await visitor.get('/api/documents?depth=0&draft=true&where[_status][equals]=draft')
    expect(((await list.json()) as { docs: Doc[] }).docs.map((d) => d.id)).not.toContain(doc.id)
  })

  test('the editor cannot publish it', async () => {
    const response = await editor.patch(`/api/documents/${doc.id}?depth=0`, { data: { _status: 'published' } })
    expect(response.status()).toBe(403)
    expect(await publicTitle(doc.id)).toBeNull()
  })

  test('a publisher publishes it; then the public sees it', async () => {
    const response = await publisher.patch(`/api/documents/${doc.id}?depth=0`, { data: { _status: 'published' } })
    expect(response.status()).toBe(200)
    expect(await publicTitle(doc.id)).toBe('[Test] Order on Testing, 2026')
  })

  test('an editor’s draft of the published document does not change what the public sees', async () => {
    const response = await editor.patch(`/api/documents/${doc.id}?draft=true&depth=0`, { data: { title: '[Test] Changed by an editor' } })
    expect(response.status()).toBe(200)
    expect(await publicTitle(doc.id)).toBe('[Test] Order on Testing, 2026')
    const latest = await editor.get(`/api/documents/${doc.id}?draft=true&depth=0`)
    expect(((await latest.json()) as Doc).title).toBe('[Test] Changed by an editor')
  })

  test('the editor cannot change the published version, unpublish it or delete it', async () => {
    expect((await editor.patch(`/api/documents/${doc.id}`, { data: { title: '[Test] Direct change' } })).status()).toBe(403)
    expect((await editor.patch(`/api/documents/${doc.id}`, { data: { _status: 'draft' } })).status()).toBe(403)
    expect((await editor.delete(`/api/documents/${doc.id}`)).status()).toBe(403)
    expect(await publicTitle(doc.id)).toBe('[Test] Order on Testing, 2026')
  })

  test('a superseded document stays public, with its status (FR-DOC-05)', async () => {
    const response = await publisher.patch(`/api/documents/${doc.id}?depth=0`, { data: { documentStatus: 'superseded', _status: 'published' } })
    expect(response.status()).toBe(200)
    const seen = await visitor.get(`/api/documents/${doc.id}?depth=0`)
    expect(((await seen.json()) as { documentStatus: string }).documentStatus).toBe('superseded')
  })

  test('two documents cannot share a web address', async () => {
    const response = await publisher.post('/api/documents?depth=0', { data: { ...fields('[Test] Order on Testing, 2026'), _status: 'published' } })
    expect(response.status()).toBe(400)
  })

  test('each step is in the audit log', async () => {
    const response = await admin.get(`/api/audit-log?where[targetType][equals]=documents&where[targetId][equals]=${doc.id}&sort=createdAt&depth=0`)
    const actions = ((await response.json()) as { docs: { action: string }[] }).docs.map((entry) => entry.action)
    expect(actions).toEqual(['content.created', 'content.published', 'content.draft-saved', 'content.published'])
  })
})

test.describe('in the admin panel (D-089)', () => {
  /** A browser signed in as the account, with the session and two-factor cookies the panel uses. */
  async function signedInBrowser(context: BrowserContext, account: TestAccount) {
    const token = await signInToken(baseURL, account)
    const totp = verifiedCookieFor(token)
    await context.clearCookies()
    await context.addCookies([
      { name: SESSION_COOKIE, value: token, url: baseURL },
      { name: TOTP_COOKIE, value: totp, url: baseURL },
    ])
  }

  test('typing is saved by itself, and is still there after signing out and in again', async ({ browser }) => {
    test.setTimeout(120_000)
    const context = await browser.newContext({ baseURL })
    try {
      await signedInBrowser(context, editorAccount)
      const page = await context.newPage()
      await page.goto('/admin/collections/documents/create')
      const title = `[Test] Autosaved ${unique()}`
      await page.locator('#field-title').fill(title)
      // Autosave creates the document and moves to its own address.
      await page.waitForURL(/\/admin\/collections\/documents\/\d+/, { timeout: 30_000 })
      const address = page.url()
      await page.locator('#field-description').fill('[Test] typed before the sign-out')
      await expect(page.getByText(/Last saved|Autosaved|Saved/i).first()).toBeVisible({ timeout: 30_000 })
      await page.waitForTimeout(3_000) // one more autosave interval, so the last keystrokes are saved

      // The session ends without warning (for example the 12-hour limit), then the person signs in again.
      await context.clearCookies()
      await page.goto(address)
      await expect(page).toHaveURL(/\/admin\/login/)
      await signedInBrowser(context, editorAccount)
      await page.goto(address)
      await expect(page.locator('#field-title')).toHaveValue(title)
      await expect(page.locator('#field-description')).toHaveValue('[Test] typed before the sign-out')
    } finally {
      await context.close()
    }
  })
})
