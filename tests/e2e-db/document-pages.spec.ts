import { randomBytes } from 'node:crypto'

import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { pdf } from '../support/zip'
import { createStaff, loadAdminAccount, signIn, visitorAddress } from './support/auth'

// The document pages read the Documents collection (D-102). The migration's four documents are
// there with their files; a draft document never appears in a list, at its own address, in
// Downloads, in the sitemap or as a related document (D-049, CLAUDE.md); an editor's draft of a
// published document leaves the public page unchanged.
// Generous: each page is made per visit from a hosted test database, slow from a developer's machine.
test.describe.configure({ mode: 'serial', timeout: 120_000 })

const LIST = '/regulatory-instruments/orders-and-directives'
const tag = randomBytes(4).toString('hex')
const DRAFT_TITLE = `[Test] Draft Order ${tag}`
const PUBLISHED_TITLE = `[Test] Published Order ${tag}`

let admin: APIRequestContext
let editor: APIRequestContext
let publisher: APIRequestContext
let visitor: APIRequestContext
let fileId: number | string
let draft: { id: number | string; slug: string }
let published: { id: number | string; slug: string }

async function html(path: string): Promise<{ status: number; body: string }> {
  const response = await visitor.get(path)
  return { status: response.status(), body: await response.text() }
}

const fields = (title: string) => ({
  title,
  category: 'orders-and-directives',
  typeLabel: 'Order',
  reference: `[Test] REF/${tag}/${title.length}`,
  documentStatus: 'published',
  publicationDate: '2099-01-01T00:00:00.000Z',
  description: `[Test] description of ${title}`,
  file: fileId,
})

test.beforeAll(async ({ baseURL }) => {
  // Four staff requests and an upload: slow against a hosted test database.
  test.setTimeout(120_000)
  admin = await signIn(baseURL!, await loadAdminAccount())
  editor = await signIn(baseURL!, await createStaff(admin, 'document-pages-editor', ['editor']))
  publisher = await signIn(baseURL!, await createStaff(admin, 'document-pages-publisher', ['publisher']))
  visitor = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })

  const upload = await editor.post('/api/document-files', {
    multipart: { file: { name: `${tag}-order.pdf`, mimeType: 'application/pdf', buffer: pdf() }, _payload: JSON.stringify({ title: `[Test] ${tag}` }) },
  })
  expect(upload.status()).toBe(201)
  fileId = ((await upload.json()) as { doc: { id: number | string } }).doc.id

  const made = await editor.post('/api/documents?draft=true&depth=0', { data: fields(DRAFT_TITLE) })
  expect(made.status()).toBe(201)
  draft = ((await made.json()) as { doc: typeof draft }).doc

  const live = await publisher.post('/api/documents?depth=0', { data: { ...fields(PUBLISHED_TITLE), related: [draft.id], _status: 'published' } })
  expect(live.status()).toBe(201)
  published = ((await live.json()) as { doc: typeof published }).doc
})

test.afterAll(async () => {
  for (const doc of [published, draft]) if (doc) await admin.delete(`/api/documents/${doc.id}`)
  await Promise.all([admin, editor, publisher, visitor].map((context) => context?.dispose()))
})

test('the migration put in the four documents, published, each with its file', async () => {
  const pages = [
    `${LIST}/ogserc-ord-2026-001`,
    `${LIST}/ogserc-ord-2026-002`,
    '/regulatory-instruments/consultation/ogserc-cp-2026-001',
    '/regulatory-instruments/consultation/draft-order-state-grid-and-ogem',
  ]
  for (const path of pages) {
    const { status, body } = await html(path)
    expect(status, path).toBe(200)
    const file = /href="(\/api\/document-files\/file\/[^"]+\.pdf)"/.exec(body)?.[1]
    expect(file, path).toBeTruthy()
    const response = await visitor.get(file!)
    expect(response.status(), file).toBe(200)
    expect((await response.body()).subarray(0, 5).toString(), file).toBe('%PDF-')
  }
  const order = await html(`${LIST}/ogserc-ord-2026-001`)
  expect(order.body).toContain('PDF, 2.5 MB, 20 pages')
  expect(order.body).toContain('id="schedule-3"')
})

test('a draft document is in no list, Downloads or the sitemap, and its address is a 404', async () => {
  for (const path of [LIST, '/resources/downloads', '/sitemap.xml', '/regulatory-instruments/consultation']) {
    const { status, body } = await html(path)
    expect(status, path).toBe(200)
    expect(body, path).not.toContain(DRAFT_TITLE)
    expect(body, path).not.toContain(draft.slug)
  }
  expect((await html(`${LIST}/${draft.slug}`)).status).toBe(404)
})

test('a published document shows, without its unpublished related document', async () => {
  expect((await html(LIST)).body).toContain(PUBLISHED_TITLE)
  expect((await html('/sitemap.xml')).body).toContain(`${LIST}/${published.slug}`)
  const page = await html(`${LIST}/${published.slug}`)
  expect(page.status).toBe(200)
  expect(page.body).toContain(PUBLISHED_TITLE)
  expect(page.body).not.toContain(DRAFT_TITLE)
  expect(page.body).not.toContain('Related documents')
})

test('an editor’s draft of a published document leaves its public page unchanged', async () => {
  const change = `[Test] Unpublished change ${tag}`
  const response = await editor.patch(`/api/documents/${published.id}?draft=true&depth=0`, { data: { title: change } })
  expect(response.status()).toBe(200)
  const page = await html(`${LIST}/${published.slug}`)
  expect(page.body).toContain(PUBLISHED_TITLE)
  expect(page.body).not.toContain(change)
})
