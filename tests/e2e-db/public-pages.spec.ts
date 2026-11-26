import { randomBytes } from 'node:crypto'

import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { createStaff, loadAdminAccount, signIn, visitorAddress } from './support/auth'

// The public pages that read the CMS (D-096) show published items only (D-049, CLAUDE.md): a draft
// never appears on the homepage, the News or Notices page, its own address or the sitemap. Search
// arrives in build step 10 and gets the same test then. Also: the real content the migration put in
// (20261124_103400_real_content) is there, and a published item shows up without a deploy.
test.describe.configure({ mode: 'serial' })

let baseURL: string
let admin: APIRequestContext
let editor: APIRequestContext
let publisher: APIRequestContext
let visitor: APIRequestContext

const tag = randomBytes(4).toString('hex')
const text = (words: string) => ({
  root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: words }] }] },
})
const DRAFT_NEWS = `[Test] Draft story ${tag}`
const DRAFT_NOTICE = `[Test] Draft notice ${tag}`
const PUBLISHED_NEWS = `[Test] Published story ${tag}`

let draftNewsSlug: string
let draftNoticeSlug: string
let publishedNewsSlug: string

async function html(path: string): Promise<{ status: number; body: string }> {
  const response = await visitor.get(path)
  return { status: response.status(), body: await response.text() }
}

test.beforeAll(async ({ baseURL: url }) => {
  baseURL = url!
  admin = await signIn(baseURL, await loadAdminAccount())
  editor = await signIn(baseURL, await createStaff(admin, 'pages-editor', ['editor']))
  publisher = await signIn(baseURL, await createStaff(admin, 'pages-publisher', ['publisher']))
  visitor = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })

  const news = { publishedDate: '2099-01-01T00:00:00.000Z', summary: '[Test] summary', body: text('[Test] story') }
  const draft = await editor.post('/api/news?draft=true&depth=0', { data: { ...news, title: DRAFT_NEWS } })
  expect(draft.status()).toBe(201)
  draftNewsSlug = ((await draft.json()) as { doc: { slug: string } }).doc.slug

  const notice = await editor.post('/api/announcements?draft=true&depth=0', {
    data: { title: DRAFT_NOTICE, category: 'public-notice', postedDate: '2099-01-01T00:00:00.000Z', summary: '[Test] summary', body: text('[Test] notice') },
  })
  expect(notice.status()).toBe(201)
  draftNoticeSlug = ((await notice.json()) as { doc: { slug: string } }).doc.slug

  const published = await publisher.post('/api/news?depth=0', { data: { ...news, title: PUBLISHED_NEWS, _status: 'published' } })
  expect(published.status()).toBe(201)
  publishedNewsSlug = ((await published.json()) as { doc: { slug: string } }).doc.slug
})

test.afterAll(async () => {
  await Promise.all([admin, editor, publisher, visitor].map((context) => context?.dispose()))
})

test('drafts are on no public page; a published item shows without a deploy', async () => {
  for (const path of ['/', '/media-center/news', '/media-center/notices']) {
    const { status, body } = await html(path)
    expect(status, path).toBe(200)
    expect(body, path).not.toContain(DRAFT_NEWS)
    expect(body, path).not.toContain(DRAFT_NOTICE)
  }
  expect((await html('/')).body).toContain(PUBLISHED_NEWS)
  expect((await html('/media-center/news')).body).toContain(PUBLISHED_NEWS)
})

test('a draft’s own address is a 404; a published story’s is not', async () => {
  expect((await html(`/media-center/news/${draftNewsSlug}`)).status).toBe(404)
  expect((await html(`/media-center/notices/${draftNoticeSlug}`)).status).toBe(404)
  const story = await html(`/media-center/news/${publishedNewsSlug}`)
  expect(story.status).toBe(200)
  expect(story.body).toContain(PUBLISHED_NEWS)
})

test('the sitemap lists the published story and no draft', async () => {
  const { status, body } = await html('/sitemap.xml')
  expect(status).toBe(200)
  expect(body).toContain(`/media-center/news/${publishedNewsSlug}`)
  expect(body).not.toContain(draftNewsSlug)
  expect(body).not.toContain(draftNoticeSlug)
})

test('after an editor saves a draft of a published story, the public still sees the published text', async () => {
  const { docs } = (await (await publisher.get(`/api/news?where[slug][equals]=${publishedNewsSlug}&depth=0`)).json()) as { docs: { id: number }[] }
  const response = await editor.patch(`/api/news/${docs[0]!.id}?draft=true&depth=0`, { data: { title: `[Test] Unpublished change ${tag}` } })
  expect(response.status()).toBe(200)
  const story = await html(`/media-center/news/${publishedNewsSlug}`)
  expect(story.body).toContain(PUBLISHED_NEWS)
  expect(story.body).not.toContain('Unpublished change')
})

test('the legal pages come from the CMS (D-100); an editor’s draft of one leaves the public text unchanged', async () => {
  const before = await html('/privacy-policy')
  expect(before.status).toBe(200)
  expect(before.body).toContain('We do not sell your personal information to anyone.')
  expect(before.body).toContain('Last updated: November 2026')
  expect((await html('/terms-of-service')).body).toContain('If you do not agree, please do not use the platform.')

  const { docs } = (await (await publisher.get('/api/pages?where[slug][equals]=privacy-policy&depth=0')).json()) as { docs: { id: number }[] }
  const draft = `[Test] Unpublished policy change ${tag}`
  const response = await editor.patch(`/api/pages/${docs[0]!.id}?draft=true&depth=0`, { data: { title: draft, body: text(draft) } })
  expect(response.status()).toBe(200)
  const after = await html('/privacy-policy')
  expect(after.body).toContain('We do not sell your personal information to anyone.')
  expect(after.body).not.toContain(draft)
})

test('the real content is there: the NERC story, the registration notice and the contact details', async () => {
  const story = await html('/media-center/news/ogserc-visits-nerc')
  expect(story.status).toBe(200)
  expect(story.body).toContain('OGSERC Visits NERC to Strengthen Regulatory Collaboration')
  const notice = await html('/media-center/notices/commencement-of-operations-and-mandatory-registration')
  expect(notice.status).toBe(200)
  expect(notice.body).toContain('1313352257')
  expect((await html('/contact')).body).toContain('info@ogserc.org.ng')
})
