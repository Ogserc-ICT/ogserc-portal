import { readdirSync } from 'node:fs'
import path from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// D-067: Resources > Downloads lists every file the site offers, grouped by document type.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const PAGE = '/resources/downloads'
const PUBLIC = path.join(process.cwd(), 'public')

/** Every document and form file under public/, as site addresses. */
function publishedFiles(): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      return entry.isDirectory() ? walk(full) : [full]
    })
  return ['documents', 'forms']
    .flatMap((dir) => walk(path.join(PUBLIC, dir)))
    .filter((file) => /\.(pdf|docx?|xlsx?)$/i.test(file))
    .map((file) => '/' + path.relative(PUBLIC, file).split(path.sep).join('/'))
    .sort()
}

test.describe('Downloads page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test('groups the files by document type, in menu order', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Downloads')
    await expect(page.getByRole('main').locator('section > h2')).toHaveText([
      'Forms',
      'Orders & Directives',
    ])
    await expect(page.getByRole('region', { name: 'Forms' }).getByRole('article')).toHaveCount(11)
    await expect(
      page.getByRole('region', { name: 'Orders & Directives' }).getByRole('article'),
    ).toHaveCount(2)
  })

  test('offers every document and form file on the site, once each', async ({ page }) => {
    const hrefs = await page
      .locator('main a[download]')
      .evaluateAll((links) => links.map((a) => decodeURI(a.getAttribute('href') ?? '')))
    expect([...hrefs].sort()).toEqual(publishedFiles())
  })

  test('every download returns its file', async ({ page, request }) => {
    // Thirteen files through the dev server; HEAD checks each one without downloading it.
    test.setTimeout(120_000)
    const hrefs = await page
      .locator('main a[download]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    for (const href of hrefs) {
      const response = await request.head(href)
      expect(response.status(), href).toBe(200)
    }
  })

  test('the Order shows its status and links to its page', async ({ page }) => {
    const order = page
      .getByRole('region', { name: 'Orders & Directives' })
      .getByRole('article')
      .filter({ hasText: 'OGSERC/ORD/2026/001' })
    await expect(order).toContainText('OGSERC/ORD/2026/001')
    await expect(order).toContainText('Published')
    await expect(order.getByRole('link').first()).toHaveAttribute(
      'href',
      '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001',
    )
  })

  test('each form links to its entry on the Forms page', async ({ page }) => {
    const form = page.getByRole('article', { name: 'Mini-grids' })
    await expect(form.getByRole('link').first()).toHaveAttribute(
      'href',
      '/regulatory-instruments/forms#reg-01e',
    )
  })

  test('download link names are unique', async ({ page }) => {
    const names = await page
      .locator('main a[download]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('aria-label') ?? ''))
    expect(new Set(names).size).toBe(names.length)
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })

  test('does not scroll sideways at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})

test('the Resources menu links to Downloads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner').locator(`a[href="${PAGE}"]`).first()).toHaveText(
    'Downloads',
  )
})
