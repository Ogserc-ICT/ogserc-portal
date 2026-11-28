import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// SRS 6.2 (FR-DOC) / D-060, D-070: Orders & Directives listing and the Orders' pages.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const LIST = '/regulatory-instruments/orders-and-directives'
const ORDER = `${LIST}/ogserc-ord-2026-001`
// The file in the CMS (D-102); its old address under public/ redirects to it.
const PDF = '/api/document-files/file/OGSERC-ORD-2026-001.pdf'
const OLD_PDF = '/documents/orders-and-directives/ogserc-ord-2026-001.pdf'
const TITLE =
  'Order on the Commencement of Operations of the Commission and the Mandatory Registration of Licensees and Electricity Operators in Ogun State, 2026'

test.describe('Orders & Directives listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LIST)
  })

  test('lists the Order with reference, date, status and its file', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Orders & Directives')
    const card = page.getByRole('article').filter({ hasText: 'OGSERC/ORD/2026/001' })
    await expect(card.getByText('26 October 2026')).toBeVisible()
    await expect(card.getByText('Published', { exact: true })).toBeVisible()
    await expect(card.getByRole('link', { name: TITLE })).toHaveAttribute('href', ORDER)
    const download = card.getByRole('link', { name: 'Download OGSERC/ORD/2026/001' })
    await expect(download).toHaveAttribute('href', PDF)
    await expect(download).toHaveAttribute('download', 'OGSERC-ORD-2026-001.pdf')
    await expect(card.getByText('PDF, 2.5 MB, 20 pages')).toBeVisible()
  })

  test('the category list marks Orders & Directives as the current page', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Instrument types' })
    await expect(nav.getByRole('link')).toHaveCount(12)
    await expect(nav.locator('[aria-current="page"]')).toHaveAccessibleName(
      'Orders & Directives (2 documents)',
    )
  })

  test('the menu links to the page', async ({ page }) => {
    const href = await page
      .getByRole('banner')
      .locator(`a[href="${LIST}"]`)
      .first()
      .getAttribute('href')
    expect(href).toBe(LIST)
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Order page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ORDER)
  })

  test('shows the title, status, dates and file', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE)
    const details = page.getByRole('region', { name: 'Document details' })
    await expect(details.getByText('OGSERC/ORD/2026/001')).toBeVisible()
    await expect(details.getByText('26 October 2026')).toBeVisible()
    await expect(details.getByText('2 November 2026')).toBeVisible()
    await expect(details.getByText('Published', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Questions?' }).getByRole('link'),
    ).toHaveAttribute('href', 'mailto:registration@ogserc.org.ng')
  })

  test('shows the full text, with anchors for each part and paragraph', async ({ page }) => {
    const text = page.getByRole('region', { name: 'Full text' })
    await expect(text.getByRole('heading', { name: 'PART I — PRELIMINARY' })).toBeVisible()
    await expect(page.locator('#paragraph-10')).toHaveText(
      '10. Principal office, filings and receipt',
    )
    await expect(page.locator('#schedule-3')).toHaveText(
      'Schedule 3: Fees and administrative charges',
    )
    // The two paragraphs split by a page break in the Word file are whole again.
    await expect(
      text.getByText(/Where the application is made at least thirty \(30\) days before expiry/),
    ).toHaveText(/^\(5\) Where the licence or permit of an Existing licensee expires/)
    const fees = text.getByRole('table', { name: 'Part A — Registration fees' })
    await expect(fees.getByRole('row')).toHaveCount(12)
    await expect(text.getByText('Jide Onakoya')).toBeVisible()
    const contents = text.getByRole('navigation', { name: 'Contents' })
    await expect(contents.getByRole('link')).toHaveCount(8)
    await contents
      .getByRole('link', { name: 'Schedule 3: Fees and administrative charges' })
      .click()
    await expect(page).toHaveURL(/#schedule-3$/)
  })

  test('the PDF is served as a PDF', async ({ request }) => {
    const response = await request.get(PDF)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('application/pdf')
    expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-')
  })

  test('the old PDF address redirects to it, and an unknown one is not found', async ({ request }) => {
    const response = await request.get(OLD_PDF, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(PDF)
    expect((await request.get('/documents/orders-and-directives/no-such-order.pdf')).status()).toBe(404)
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })

  test('an unknown document is a 404', async ({ request }) => {
    const response = await request.get(`${LIST}/ogserc-ord-2026-999`)
    expect(response.status()).toBe(404)
  })
})

test.describe('Order 002 (D-070)', () => {
  const ORDER_2 = `${LIST}/ogserc-ord-2026-002`
  const PDF_2 = '/api/document-files/file/OGSERC-ORD-2026-002.pdf'
  const TITLE_2 =
    'Order on the Transitional Adoption of NERC Regulatory Instruments in the Ogun State Electricity Market'

  test('the listing shows it first, newest first', async ({ page }) => {
    await page.goto(LIST)
    const cards = page.getByRole('main').getByRole('article')
    await expect(cards.first()).toContainText('OGSERC/ORD/2026/002')
    const card = cards.filter({ hasText: 'OGSERC/ORD/2026/002' })
    await expect(card.getByText('2 November 2026')).toBeVisible()
    await expect(card.getByRole('link', { name: TITLE_2 })).toHaveAttribute('href', ORDER_2)
    await expect(card.getByText('PDF, 3.4 MB, 11 pages')).toBeVisible()
  })

  test('its page shows the dates from the signed copy and the full text', async ({ page }) => {
    await page.goto(ORDER_2)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE_2)
    const details = page.getByRole('region', { name: 'Document details' })
    await expect(details.getByText('OGSERC/ORD/2026/002')).toBeVisible()
    await expect(details.getByText('2 November 2026')).toBeVisible()
    await expect(details.getByText('3 November 2026')).toBeVisible()
    const text = page.getByRole('region', { name: 'Full text' })
    await expect(text.getByText(/takes effect on November 3, 2026/)).toBeVisible()
    await expect(page.locator('#paragraph-12')).toHaveText('12. Transitional tariffs and charges')
    await expect(
      text.getByRole('table', { name: 'Adopted instruments' }).getByRole('row'),
    ).toHaveCount(15)
    await expect(
      text.getByRole('table', { name: 'Excluded instruments and provisions' }).getByRole('row'),
    ).toHaveCount(7)
    await expect(text.getByRole('navigation', { name: 'Contents' }).getByRole('link')).toHaveCount(
      7,
    )
  })

  test('the PDF is served as a PDF', async ({ request }) => {
    const response = await request.get(PDF_2)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('application/pdf')
  })

  test('has no WCAG 2.1 AA violations and no sideways scrolling at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await page.goto(ORDER_2)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('PDF preview', () => {
  test('shows on desktop and can be hidden; phones get no preview', async ({ page }, testInfo) => {
    await page.goto(ORDER)
    const frame = page.locator('iframe#pdf-preview')
    if (testInfo.project.name === 'mobile') {
      await expect(page.getByRole('link', { name: 'Open' })).toBeVisible()
      await expect(frame).toHaveCount(0)
      return
    }
    await expect(frame).toBeVisible()
    await expect(frame).toHaveAttribute('src', PDF)
    const toggle = page.getByRole('button', { name: 'Hide preview' })
    await toggle.click()
    await expect(frame).toBeHidden()
    await expect(page.getByRole('button', { name: 'Show preview' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})

test('neither page scrolls sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  for (const path of [LIST, ORDER]) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, path).toBe(0)
  }
})
