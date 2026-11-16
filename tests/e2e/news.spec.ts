import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// D-068: Media Center > News lists the homepage's Latest updates, newest first.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const PAGE = '/media-center/news'
const NOTICE_PATH = '/media-center/notices/commencement-of-operations-and-mandatory-registration'
const STORY_PATH = '/media-center/news/ogserc-visits-nerc'

test.describe('News page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test('lists the updates newest first, the NERC visit on top', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('News')
    const cards = page.getByRole('main').getByRole('article')
    await expect(cards).toHaveCount(4)
    await expect(cards.nth(0).getByRole('link')).toHaveAttribute('href', STORY_PATH)
    const dates = await cards
      .locator('time')
      .evaluateAll((els) => els.map((el) => el.getAttribute('datetime') ?? ''))
    expect(dates).toEqual([...dates].sort().reverse())
    await expect(cards.nth(1).getByRole('link')).toHaveAttribute('href', NOTICE_PATH)
    await expect(cards.nth(2).getByRole('link')).toHaveAttribute(
      'href',
      '/regulatory-instruments/forms',
    )
    await expect(cards.nth(3).getByRole('link')).toHaveAttribute(
      'href',
      '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001',
    )
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

test('the Media Center menu and the homepage link to News', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner').locator(`a[href="${PAGE}"]`).first()).toHaveText('News')
  await expect(page.getByRole('link', { name: 'View all news' })).toHaveAttribute('href', PAGE)
})
