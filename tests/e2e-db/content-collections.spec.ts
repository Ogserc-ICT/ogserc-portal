import { randomBytes } from 'node:crypto'

import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { pdf } from '../support/zip'
import { createStaff, loadAdminAccount, signIn, visitorAddress } from './support/auth'

// The content collections after Documents (D-092, D-093) over HTTP on the running server: each
// follows the content rules (D-049) — an editor's draft is invisible to visitors and cannot be
// published by the editor; a publisher publishes; visitors then see it — and each step is in the
// audit log with the collection as its target. Also the site settings (D-093).

let admin: APIRequestContext
let editor: APIRequestContext
let publisher: APIRequestContext
let visitor: APIRequestContext
let fileId: number | string

/** The smallest rich text Payload's editor accepts: one paragraph. */
const text = (words: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: words }] }],
  },
})

const unique = () => randomBytes(4).toString('hex')

/** What each collection needs to be published, with made-up, clearly marked values. */
const COLLECTIONS: Record<string, (title: string) => Record<string, unknown>> = {
  news: (title) => ({ title, publishedDate: '2026-11-23T00:00:00.000Z', summary: '[Test] summary', body: text('[Test] story') }),
  announcements: (title) => ({
    title,
    category: 'public-notice',
    postedDate: '2026-11-23T00:00:00.000Z',
    summary: '[Test] summary',
    body: text('[Test] notice'),
  }),
  events: (title) => ({ title, startsAt: '2026-12-01T09:00:00.000Z', venue: '[Test] venue', summary: '[Test] summary' }),
  tenders: (title) => ({
    title,
    publishedDate: '2026-11-23T00:00:00.000Z',
    closesAt: '2026-12-15T12:00:00.000Z',
    summary: '[Test] summary',
    body: text('[Test] details'),
  }),
  reports: (title) => ({
    title,
    reportType: 'annual',
    period: '2026',
    publishedDate: '2026-11-23T00:00:00.000Z',
    summary: '[Test] summary',
    file: fileId,
  }),
  faqs: (title) => ({ title, answer: text('[Test] answer'), topic: '[Test] topic' }),
  pages: (title) => ({ title, body: text('[Test] page text') }),
  galleries: (title) => ({
    title,
    date: '2026-11-23T00:00:00.000Z',
    summary: '[Test] summary',
    videos: [{ url: 'https://www.youtube.com/watch?v=test', title: '[Test] video' }],
  }),
}

/** FAQs have no web address of their own; every other collection makes one from the title. */
const HAS_SLUG = (slug: string) => slug !== 'faqs'

test.beforeAll(async ({ baseURL }) => {
  admin = await signIn(baseURL!, await loadAdminAccount())
  editor = await signIn(baseURL!, await createStaff(admin, 'news-editor', ['editor']))
  publisher = await signIn(baseURL!, await createStaff(admin, 'news-publisher', ['publisher']))
  visitor = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  const upload = await editor.post('/api/document-files', {
    multipart: { file: { name: `${unique()}-report.pdf`, mimeType: 'application/pdf', buffer: pdf() }, _payload: JSON.stringify({ title: '[Test] report' }) },
  })
  expect(upload.status()).toBe(201)
  fileId = ((await upload.json()) as { doc: { id: number | string } }).doc.id
})

test.afterAll(async () => {
  await Promise.all([admin, editor, publisher, visitor].map((context) => context?.dispose()))
})

for (const [slug, data] of Object.entries(COLLECTIONS)) {
  test(`${slug}: draft hidden, editor cannot publish, publisher publishes, audit log`, async () => {
    const title = `[Test] ${slug} ${unique()}`
    const created = await editor.post(`/api/${slug}?draft=true&depth=0`, { data: data(title) })
    expect(created.status(), await created.text()).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number | string; slug?: string } }
    if (HAS_SLUG(slug)) expect(doc.slug).toMatch(/^test-/)

    const seen = async () => {
      const response = await visitor.get(`/api/${slug}?depth=0&draft=true&where[id][equals]=${doc.id}`)
      expect(response.status()).toBe(200)
      return ((await response.json()) as { docs: unknown[] }).docs.length
    }
    expect(await seen()).toBe(0)

    expect((await editor.patch(`/api/${slug}/${doc.id}`, { data: { _status: 'published' } })).status()).toBe(403)
    expect(await seen()).toBe(0)

    const published = await publisher.patch(`/api/${slug}/${doc.id}?depth=0`, { data: { _status: 'published' } })
    expect(published.status(), await published.text()).toBe(200)
    expect(await seen()).toBe(1)

    const log = await admin.get(`/api/audit-log?where[targetType][equals]=${slug}&where[targetId][equals]=${doc.id}&sort=createdAt&depth=0`)
    expect(((await log.json()) as { docs: { action: string }[] }).docs.map((entry) => entry.action)).toEqual([
      'content.created',
      'content.published',
    ])
  })
}

test('an event’s registration link must be an https address', async () => {
  const response = await publisher.post('/api/events?depth=0', {
    data: { ...COLLECTIONS.events!(`[Test] event ${unique()}`), registrationLink: 'http://example.org/register', _status: 'published' },
  })
  expect(response.status()).toBe(400)
  expect(await response.text()).toContain('https://')
})

test('an announcement needs one of the four categories (FR-NEWS-03)', async () => {
  const response = await publisher.post('/api/announcements?depth=0', {
    data: { ...COLLECTIONS.announcements!(`[Test] notice ${unique()}`), category: 'press-release', _status: 'published' },
  })
  expect(response.status()).toBe(400)
})

test.describe('site settings (D-093)', () => {
  const contact = { addressLines: [{ line: '[Test] address' }], phone: '[Test] phone', email: 'test@example.org' }

  test('visitors can read them; editors cannot change them; publishers can, and it is in the audit log', async () => {
    expect((await visitor.get('/api/globals/site-settings')).status()).toBe(200)
    expect((await editor.post('/api/globals/site-settings', { data: { footerSummary: '[Test] by an editor' } })).status()).toBe(403)
    const summary = `[Test] footer ${unique()}`
    const saved = await publisher.post('/api/globals/site-settings', { data: { contact, footerSummary: summary } })
    expect(saved.status(), await saved.text()).toBe(200)
    const seen = (await (await visitor.get('/api/globals/site-settings')).json()) as { footerSummary?: string }
    expect(seen.footerSummary).toBe(summary)
    const log = await admin.get('/api/audit-log?where[action][equals]=settings.updated&sort=-createdAt&limit=1&depth=0')
    const [entry] = ((await log.json()) as { docs: { details?: { fields?: string[] } }[] }).docs
    expect(entry?.details?.fields).toContain('footerSummary')
  })

  test('About OGSERC (D-098): visitors read it, editors cannot change it, a publisher’s change shows on the page and is logged', async () => {
    expect((await visitor.get('/api/globals/about-ogserc')).status()).toBe(200)
    expect((await editor.post('/api/globals/about-ogserc', { data: { mission: { vision: '[Test] by an editor' } } })).status()).toBe(403)
    const original = (await (await publisher.get('/api/globals/about-ogserc?depth=0')).json()) as { mission: Record<string, unknown> }
    const vision = `[Test] vision ${unique()}`
    try {
      const saved = await publisher.post('/api/globals/about-ogserc', { data: { mission: { ...original.mission, vision } } })
      expect(saved.status(), await saved.text()).toBe(200)
      expect(await (await visitor.get('/about/mission')).text()).toContain(vision)
      const log = await admin.get('/api/audit-log?where[targetType][equals]=about-ogserc&sort=-createdAt&limit=1&depth=0')
      const [entry] = ((await log.json()) as { docs: { action?: string; details?: { fields?: string[] } }[] }).docs
      expect(entry?.action).toBe('settings.updated')
      expect(entry?.details?.fields).toEqual(['mission'])
    } finally {
      await publisher.post('/api/globals/about-ogserc', { data: { mission: original.mission } })
    }
  })

  test('a slide button cannot link to another site over plain http or a script', async () => {
    for (const actionLink of ['http://example.org', 'javascript:alert(1)', '//evil.example']) {
      const response = await publisher.post('/api/globals/site-settings', {
        data: { contact, heroSlides: [{ image: 1, headline: '[Test]', actionLabel: '[Test]', actionLink }] },
      })
      expect(response.status(), actionLink).toBe(400)
    }
  })
})
