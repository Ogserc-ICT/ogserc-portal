import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// SRS Section 4: the About OGSERC pages (D-061, D-064).

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const ABOUT_PAGES = [
  { path: '/about', title: 'About Us' },
  { path: '/about/history', title: 'Our History' },
  { path: '/about/mission', title: 'Vision, Mission & Values' },
  { path: '/about/structure', title: "OGSERC's Structure" },
]

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const { path, title } of ABOUT_PAGES) {
  test.describe(title, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path)
    })

    test('has its title and marks itself in the About OGSERC links', async ({ page }) => {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      const sectionNav = page.getByRole('main').getByRole('navigation', { name: 'About OGSERC' })
      await expect(sectionNav.getByRole('link')).toHaveText(ABOUT_PAGES.map((p) => p.title))
      await expect(sectionNav.locator('[aria-current="page"]')).toHaveText(title)
    })

    test('has no WCAG 2.1 AA violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
      expect(results.violations).toEqual([])
    })

    test('does not scroll sideways at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 })
      expect(await sideways(page)).toBe(0)
    })
  })
}

test('About Us shows the introduction and what OGSERC does', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('main')).toContainText(
    'regulates the electricity market in Ogun State, independently of the operators it oversees',
  )
  await expect(page.locator('#what-we-do li')).toHaveCount(6)
  await expect(page.locator('#what-we-do')).toContainText(
    'We are building the Ogun State Electricity Market (OGEM).',
  )
})

test('Our History tells the story and lists the key dates in order', async ({ page }) => {
  await page.goto('/about/history')
  await expect(page.getByRole('main')).toContainText(
    'OGSERC exists because of the Electricity Act, 2023.',
  )
  const dates = page.getByRole('region', { name: 'Key dates' }).locator('li > p:first-of-type')
  await expect(dates.first()).toHaveText('2023')
  await expect(dates.last()).toHaveText('23 June 2025')
  await expect(dates).toHaveCount(8)
})

test.describe("OGSERC's Structure", () => {
  test('shows the five divisions with their organogram units', async ({ page }) => {
    await page.goto('/about/structure')
    await expect(page.getByRole('main')).toContainText('five (5) Commissioners')
    const organogram = page.getByRole('region', { name: 'Organogram' })
    await expect(organogram.getByRole('heading', { level: 3 })).toHaveText([
      'Office of the Chairman',
      'Legal, Licensing and Consumer Affairs',
      'Engineering Services',
      'Financial Management Services',
      'Electricity Market, Planning and Research',
    ])
    const engineering = page.getByRole('region', { name: 'Engineering Services' })
    await expect(engineering.getByRole('listitem')).toHaveText([
      'Engineering Standard',
      'Networks',
      'Performance Monitoring',
      'Occupational Health, Safety and Performance Analysis',
    ])
  })

  test('each division in the list jumps to its organogram box', async ({ page }) => {
    await page.goto('/about/structure')
    await page.getByRole('link', { name: 'Financial Management Services' }).click()
    await expect(page).toHaveURL(/#financial-management-services$/)
    await expect(page.locator('#financial-management-services')).toBeInViewport()
  })
})

test('the About OGSERC menu links to all four pages', async ({ page }) => {
  await page.goto('/')
  const banner = page.getByRole('banner')
  for (const { path, title } of ABOUT_PAGES) {
    await expect(banner.locator(`a[href="${path}"]`).first()).toHaveText(title)
  }
})
