import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// FR-WEB-06 legal pages, with OGSERC's supplied text (D-074).

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const LEGAL_PAGES = [
  {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    headings: [
      '1. Introduction',
      '2. Information We Collect',
      '3. How We Use Your Information',
      '4. Sharing Your Information',
      '5. Keeping Your Data Secure',
      '6. Your Rights',
      '7. Cookies and Visitor Statistics',
      '8. Contact Us',
    ],
    quote: 'We do not sell your personal information to anyone.',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service',
    headings: [
      '1. Agreement to These Terms',
      '2. Using the Platform',
      '3. Submissions and Records',
      '4. Platform Availability',
      '5. Limitation of Liability',
      '6. Updates to These Terms',
      '7. Contact Us',
    ],
    quote: 'If you do not agree, please do not use the platform.',
  },
]

for (const { path, title, headings, quote } of LEGAL_PAGES) {
  test.describe(title, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path)
    })

    test('opens from the footer', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name: title }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    })

    test('shows the date, every section and the contact email', async ({ page }) => {
      const main = page.getByRole('main')
      await expect(main).toContainText('Last updated: November 2026')
      await expect(main.getByRole('heading', { level: 2 })).toHaveText(headings)
      await expect(main).toContainText(quote)
      await expect(main.getByRole('link', { name: 'info@ogserc.org.ng' })).toHaveAttribute(
        'href',
        'mailto:info@ogserc.org.ng',
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
}
