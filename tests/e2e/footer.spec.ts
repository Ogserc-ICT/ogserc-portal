import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// FR-WEB-12 / D-040: decorative footer pattern. Text contrast over it is checked by calculation
// in D-040 (axe cannot measure text over a background image and reports such text as
// "incomplete", not as passing). These tests check everything that can be checked in the browser.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const footer = (page: Page) => page.getByRole('contentinfo')

test.describe('Footer pattern', () => {
  for (const width of [360, 1280]) {
    test(`at ${width}px: decorative, behind the text, and no horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      // The Next.js dev-tools badge (development only) is fixed over the bottom-left corner.
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
      const pattern = page.locator('footer .footer-grid')
      await expect(pattern).toHaveAttribute('aria-hidden', 'true')
      await expect(pattern).toHaveCSS('pointer-events', 'none')
      await expect(pattern).toHaveCSS('z-index', '-1')

      // Every footer link is the element actually hit at its centre: the pattern never covers it.
      await footer(page).scrollIntoViewIfNeeded()
      const links = await footer(page).getByRole('link').all()
      for (const link of links) {
        await link.scrollIntoViewIfNeeded()
        const onTop = await link.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return !!hit && (hit === el || el.contains(hit))
        })
        expect(onTop, (await link.textContent()) ?? '').toBe(true)
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('the footer has no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page }).include('footer').withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})
