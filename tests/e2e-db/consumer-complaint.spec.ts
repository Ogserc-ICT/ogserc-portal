import { randomBytes } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { createStaff, loadAdminAccount, signIn, visitorAddress } from './support/auth'

// FR-CON-01/02 Consumer Complaint page (D-101). The migration puts its text in as a draft, so until
// a publisher publishes it the address shows "being prepared", is not indexed and is not in the
// sitemap; once published, it shows the text, its "On this page" list and the complaint steps, at
// 360px and on a desktop with no axe violations. An editor's later draft never reaches the public.
test.describe.configure({ mode: 'serial' })

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const PATH = '/consumer-complaint'
const SECTIONS = [
  'Your rights',
  'Your obligations',
  'How to complain',
  'What to include in your complaint',
  'Service standards',
  'Billing and meter reading',
  'Disconnection and reconnection',
  'Fees',
  'Safety',
  'Frequently asked questions',
  'Contact OGSERC',
]

let admin: APIRequestContext
let editor: APIRequestContext
let publisher: APIRequestContext
let visitor: APIRequestContext
let pageId: number

const tag = randomBytes(4).toString('hex')

async function html(path: string): Promise<{ status: number; body: string }> {
  const response = await visitor.get(path)
  return { status: response.status(), body: await response.text() }
}

const setStatus = (status: 'published' | 'draft') => publisher.patch(`/api/pages/${pageId}?depth=0`, { data: { _status: status } })

test.beforeAll(async ({ baseURL }) => {
  admin = await signIn(baseURL!, await loadAdminAccount())
  editor = await signIn(baseURL!, await createStaff(admin, 'complaint-editor', ['editor']))
  publisher = await signIn(baseURL!, await createStaff(admin, 'complaint-publisher', ['publisher']))
  visitor = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  const found = await publisher.get('/api/pages?where[slug][equals]=consumer-complaint&draft=true&depth=0')
  const { docs } = (await found.json()) as { docs: { id: number; _status: string }[] }
  expect(docs).toHaveLength(1)
  pageId = docs[0]!.id
})

test.afterAll(async () => {
  // Leave the page as the migration did: unpublished.
  if (publisher && pageId) await setStatus('draft')
  await Promise.all([admin, editor, publisher, visitor].map((context) => context?.dispose()))
})

test('the migration leaves the page unpublished: "being prepared", not indexed, not in the sitemap', async () => {
  const { status, body } = await html(PATH)
  expect(status).toBe(200)
  expect(body).toContain('This section is being prepared')
  expect(body).not.toContain('How to complain')
  expect(body).toMatch(/<meta name="robots" content="[^"]*noindex/)
  expect((await html('/sitemap.xml')).body).not.toContain(PATH)
})

test('once published, the page shows its sections and is in the sitemap', async () => {
  expect((await setStatus('published')).status()).toBe(200)
  const { status, body } = await html(PATH)
  expect(status).toBe(200)
  expect(body).not.toContain('This section is being prepared')
  expect(body).not.toMatch(/<meta name="robots" content="[^"]*noindex/)
  expect(body).toContain('Still not resolved after 30 days? Take it to OGSERC.')
  expect(body).toContain('href="mailto:ccu@ogserc.org.ng"')
  expect((await html('/sitemap.xml')).body).toContain(PATH)
})

for (const width of [360, 1280]) {
  test(`at ${width}px: the menu leads here, every section is linked from "On this page", no axe violations`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    if (width < 1024) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click()
      await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'Consumer Complaint' }).click()
    } else {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Consumer Complaint' }).click()
    }
    await expect(page).toHaveURL(new RegExp(`${PATH}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Consumer Complaint')

    const main = page.getByRole('main')
    const contents = main.getByRole('navigation', { name: 'On this page' })
    await expect(contents.getByRole('link')).toHaveText(SECTIONS)
    await contents.getByRole('link', { name: 'How to complain' }).click()
    await expect(page).toHaveURL(new RegExp(`${PATH}#how-to-complain$`))
    await expect(main.getByRole('heading', { level: 2, name: 'How to complain' })).toBeInViewport()
    await expect(main.locator('.consumer-text > ol > li')).toHaveCount(6)

    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('an editor’s draft of the published page leaves the public text unchanged', async () => {
  const draft = `[Test] Unpublished complaint change ${tag}`
  const response = await editor.patch(`/api/pages/${pageId}?draft=true&depth=0`, { data: { summary: draft } })
  expect(response.status()).toBe(200)
  const { body } = await html(PATH)
  expect(body).toContain('How to complain')
  expect(body).not.toContain(draft)
})

test('unpublished again, the address goes back to "being prepared"', async () => {
  expect((await setStatus('draft')).status()).toBe(200)
  const { body } = await html(PATH)
  expect(body).toContain('This section is being prepared')
  expect((await html('/sitemap.xml')).body).not.toContain(PATH)
})
