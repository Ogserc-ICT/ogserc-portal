import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { waitForSettledPage } from './support/settle'

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// FR-WEB-02 order, after the hero (which holds the page's only h1, and one h2 per slide).
const SECTION_HEADINGS = [
  'Quick services',
  'Latest updates',
  'Public notices',
  'Contact us',
]

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('has header, main, and footer landmarks with sections in FR-WEB-02 order', async ({
    page,
  }) => {
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()

    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1)
    const sectionHeadings = main.locator('h2:not([aria-roledescription="carousel"] h2)')
    await expect(sectionHeadings).toHaveText(SECTION_HEADINGS)
  })

  test('hero has the h1, and the visible slide has a headline and exactly one primary action', async ({
    page,
  }) => {
    const hero = page.getByRole('region', { name: 'Highlights' })
    await expect(hero.getByRole('heading', { level: 1 })).toBeVisible()
    const current = hero.locator('[aria-roledescription="slide"]:not([inert])')
    await expect(current).toHaveCount(1)
    await expect(current.getByRole('heading', { level: 2 })).toHaveText(
      'Electricity for all in Ogun State',
    )
    await expect(current.getByRole('link')).toHaveCount(1)
    await expect(current.getByRole('link')).toHaveAccessibleName('Learn more about OGSERC')
  })

  test('has the OGSERC favicon and home-screen icon', async ({ page, request }) => {
    for (const rel of ['icon', 'apple-touch-icon']) {
      const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute('href')
      expect(href, rel).toBeTruthy()
      const response = await request.get(href ?? '')
      expect(response.status(), rel).toBe(200)
      expect(response.headers()['content-type'], rel).toBe('image/png')
    }
  })

  test('quick services list the five SRS services', async ({ page }) => {
    const services = page
      .locator('section[aria-labelledby="quick-services-heading"]')
      .getByRole('link')
    await expect(services).toHaveText([
      'Consumer Complaint',
      'Licences',
      'Regulatory Instruments',
      'Energy Caps',
      'FAQs',
    ])
  })

  test('shows only clearly marked placeholder content', async ({ page }) => {
    await expect(page.getByText(/OGSERC to supply/).first()).toBeVisible()
  })

  test('the first slide shows the introduction', async ({ page }) => {
    await expect(
      page.getByText("Transparent oversight and robust regulation of Ogun State's power sector."),
    ).toBeVisible()
  })

  test('public notices are listed newest first', async ({ page }) => {
    const dates = await page
      .locator('section[aria-labelledby="public-notices-heading"] time')
      .evaluateAll((els) => els.map((el) => el.getAttribute('datetime') ?? ''))
    expect(dates.length).toBeGreaterThan(1)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  test('latest updates show the Order, with no scroll region for a single item', async ({
    page,
  }) => {
    const section = page.locator('section[aria-labelledby="latest-updates-heading"]')
    await expect(section.getByRole('article')).toHaveCount(1)
    await expect(section.getByRole('link', { name: /Order on Commencement of Operations/ })).toHaveAttribute(
      'href',
      '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001',
    )
    await expect(section.getByRole('region')).toHaveCount(0)
  })

  test('the hero fills most of a phone screen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The taller hero applies to phones only')
    const hero = page.getByRole('region', { name: 'Highlights' })
    const height = (await hero.boundingBox())?.height ?? 0
    const viewport = page.viewportSize()?.height ?? 0
    expect(height).toBeGreaterThanOrEqual(viewport * 0.69)
  })

  test('the page does not scroll sideways', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('skip link moves focus to the main content', async ({ page }) => {
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#main$/)
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    // The pause/play button renders after hydration; then every section is faded in and settled,
    // so axe checks all of them at full opacity.
    await expect(page.getByRole('button', { name: /slideshow/ })).toBeVisible()
    await waitForSettledPage(page)
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})
