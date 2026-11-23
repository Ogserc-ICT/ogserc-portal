import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// D-088: the Registered Operators page, linked from the homepage's quick services.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const PATH = '/registered-operators'

test.describe(PATH, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH)
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

  test('lists Verge Power Limited as operator number 1', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Registered Operators')
    const first = page.getByRole('table').getByRole('row').nth(1)
    await expect(first.getByRole('cell')).toHaveText(['1', 'OGSERC/REG/2026/F-DIS/0001'])
    await expect(first.getByRole('rowheader')).toHaveText('VERGE POWER LIMITED')
  })
})

test('the homepage quick service opens the page', async ({ page }) => {
  await page.goto('/')
  await page
    .locator('section[aria-labelledby="quick-services-heading"]')
    .getByRole('link', { name: 'Registered Operators' })
    .click()
  await expect(page).toHaveURL(new RegExp(`${PATH}$`))
})
