import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// SRS 6.3 (FR-DRAFT-01, FR-DRAFT-02) / D-071: Consultation listing, the paper and the draft Order.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const LIST = '/regulatory-instruments/consultation'
const PAPER = `${LIST}/ogserc-cp-2026-001`
const DRAFT = `${LIST}/draft-order-state-grid-and-ogem`
const PAPER_PDF = '/documents/consultation/ogserc-cp-2026-001.pdf'
const DRAFT_PDF = '/documents/consultation/draft-order-state-grid-and-ogem.pdf'
const PAPER_TITLE =
  'Regularization of Unlicensed Electricity Distribution in the Sagamu Interchange, Ota and Agbara Areas, and Gas Supply for Embedded Generation'
const DRAFT_TITLE =
  'Order on the Establishment of the Ogun State Grid and the Ogun Electricity Market, Gas Supply for Embedded Generation Connected to the State Grid, and the Regularisation of Unlicensed Distribution and Third-Party Investment in Industrial Distribution Zones in Ogun State'
const SUBJECT = 'Response to CP/2026/001: Regularization of Distribution in the Areas'

test.describe('Consultation listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LIST)
  })

  test('lists the paper and the draft Order with their deadline', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Consultation')
    const cards = page.getByRole('main').getByRole('article')
    await expect(cards).toHaveCount(2)
    const paper = cards.filter({ hasText: 'OGSERC/CP/2026/001' })
    await expect(paper.getByRole('link', { name: PAPER_TITLE })).toHaveAttribute('href', PAPER)
    await expect(paper.getByText('16 November 2026')).toBeVisible()
    await expect(paper.getByText('Comments by 30 November 2026')).toBeVisible()
    await expect(paper.getByText('PDF, 1.0 MB, 24 pages')).toBeVisible()
    const draft = cards.filter({ hasText: 'Draft Order' })
    await expect(draft.getByRole('link', { name: DRAFT_TITLE })).toHaveAttribute('href', DRAFT)
    await expect(draft.getByText('PDF, 1.3 MB, 63 pages')).toBeVisible()
  })

  test('the category list marks Consultation as the current page', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Instrument types' })
    await expect(nav.locator('[aria-current="page"]')).toHaveAccessibleName(
      'Consultation (2 documents)',
    )
  })

  test('the menu links to the page', async ({ page }) => {
    await expect(page.getByRole('banner').locator(`a[href="${LIST}"]`).first()).toHaveText(
      'Consultation',
    )
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Consultation documents', () => {
  test('the paper shows how to comment, and links to the draft Order', async ({ page }) => {
    await page.goto(PAPER)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAPER_TITLE)
    const say = page.getByRole('region', { name: 'Have your say' })
    await expect(say.getByText('30 November 2026')).toBeVisible()
    await expect(say.getByText('3 December 2026, Abeokuta')).toBeVisible()
    await expect(say.getByText(SUBJECT)).toBeVisible()
    await expect(say.getByRole('link', { name: 'info@ogserc.org.ng' })).toHaveAttribute(
      'href',
      `mailto:info@ogserc.org.ng?subject=${encodeURIComponent(SUBJECT)}`,
    )
    const details = page.getByRole('region', { name: 'Document details' })
    await expect(details.getByText('Consultation paper', { exact: true })).toBeVisible()
    await expect(details.getByText('16 November 2026')).toBeVisible()
    await expect(
      page
        .getByRole('region', { name: 'Related documents' })
        .getByRole('link', { name: DRAFT_TITLE }),
    ).toHaveAttribute('href', DRAFT)
  })

  test('the draft Order says it is a draft with no legal effect', async ({ page }) => {
    await page.goto(DRAFT)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(DRAFT_TITLE)
    await expect(page.getByText('Not yet made by the Commission; no legal effect.')).toBeVisible()
    const details = page.getByRole('region', { name: 'Document details' })
    await expect(details.getByText('Draft Order', { exact: true })).toBeVisible()
    await expect(details.getByText('OGSERC/ORD/2026/[●] (draft)')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Have your say' })).toContainText(
      '30 November 2026',
    )
    await expect(
      page
        .getByRole('region', { name: 'Related documents' })
        .getByRole('link', { name: PAPER_TITLE }),
    ).toHaveAttribute('href', PAPER)
  })

  test('both PDFs are served as PDFs', async ({ request }) => {
    for (const href of [PAPER_PDF, DRAFT_PDF]) {
      const response = await request.get(href)
      expect(response.status(), href).toBe(200)
      expect(response.headers()['content-type'], href).toBe('application/pdf')
    }
  })

  test('an unknown document is a 404', async ({ request }) => {
    const response = await request.get(`${LIST}/ogserc-cp-2026-999`)
    expect(response.status()).toBe(404)
  })

  test('no WCAG 2.1 AA violations and no sideways scrolling at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    for (const path of [LIST, PAPER, DRAFT]) {
      await page.goto(path)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, path).toBe(0)
      const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
      expect(results.violations, path).toEqual([])
    }
  })
})
