import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// SRS Section 4 / D-061: the About OGSERC "Vision, Mission & Values" page.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const PATH = '/about/mission'

test.describe('Vision, Mission & Values', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH)
  })

  test('shows the vision, mission and the five PRIDE values', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vision, Mission & Values')
    await expect(page.locator('#vision')).toContainText(
      'A reliable, investable and fair electricity market',
    )
    await expect(page.locator('#mission')).toContainText(
      'To regulate the Ogun State Electricity Market transparently and predictably',
    )
    await expect(page.getByRole('main').getByRole('heading', { level: 3 })).toHaveText([
      'Predictability',
      'Responsiveness',
      'Integrity',
      'Data',
      'Excellence',
    ])
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

test('the About OGSERC menu links to the page', async ({ page }) => {
  await page.goto('/')
  const link = page.getByRole('banner').locator(`a[href="${PATH}"]`).first()
  await expect(link).toHaveText('Vision, Mission & Values')
})
