import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// SRS Section 4: the seven main-menu items, and how many links each dropdown holds.
const MENU_ITEMS = [
  'About OGSERC',
  'Regulatory Instruments',
  'Mandate',
  'Consumer Complaint',
  'Media Center',
  'Resources',
  'User Profile',
]
const DROPDOWNS: Record<string, number> = {
  'About OGSERC': 4,
  'Regulatory Instruments': 11,
  Mandate: 4,
  'Media Center': 4,
  Resources: 6,
}

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' })
const isMobile = (projectName: string) => projectName === 'mobile'

test.describe('Utility bar, footer, and placeholder pages', () => {
  test('utility bar has Contact Us, Licences, FAQs, Search', async ({ page }) => {
    await page.goto('/')
    const utility = page.getByRole('navigation', { name: 'Utility' })
    await expect(utility.getByRole('link')).toHaveText(['Contact Us', 'Licences', 'FAQs', 'Search'])
  })

  test('search goes to the shared "being prepared" page, which has breadcrumbs', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .getByRole('navigation', { name: 'Utility' })
      .getByRole('link', { name: 'Search' })
      .click()
    await expect(page).toHaveURL(/\/being-prepared$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'This section is being prepared',
    )
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(breadcrumb.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
      'This section is being prepared',
    )
  })

  test('footer has the legal page links (FR-WEB-06)', async ({ page }) => {
    await page.goto('/')
    const legal = page.getByRole('navigation', { name: 'Legal' })
    await expect(legal.getByRole('link')).toHaveText([
      'Privacy Policy',
      'Terms of Service',
      'Cookie Notice',
      'Accessibility Statement',
      'Sitemap',
    ])
  })

  test('every link in the header and footer resolves', async ({ page, request }) => {
    await page.goto('/')
    const hrefs = await page
      .locator('header a[href], footer a[href]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    for (const href of new Set(hrefs)) {
      const response = await request.get(href)
      expect(response.status(), href).toBe(200)
    }
  })

  for (const path of ['/being-prepared', '/design-system']) {
    test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
      expect(results.violations).toEqual([])
    })
  }
})

test.describe('Main menu on desktop', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'Desktop menu is shown from 1024px')
    await page.goto('/')
  })

  test('shows the seven SRS menu items and no Menu button', async ({ page }) => {
    const items = mainNav(page).locator(':scope > ul > li > :first-child')
    await expect(items).toHaveText(MENU_ITEMS)
    await expect(mainNav(page).getByRole('button', { name: 'Menu' })).toBeHidden()
  })

  for (const [label, count] of Object.entries(DROPDOWNS)) {
    test(`"${label}" dropdown opens on click with ${count} links`, async ({ page }) => {
      const button = mainNav(page).getByRole('button', { name: label })
      await expect(button).toHaveAttribute('aria-expanded', 'false')
      await button.click()
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      const panel = page.locator(`#${await button.getAttribute('aria-controls')}`)
      await expect(panel.getByRole('link')).toHaveCount(count)
      await expect(panel.getByRole('link').first()).toBeVisible()
    })
  }

  test('the menu bar fits at 1024px, the narrowest desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('dropdowns work with the keyboard and close with Escape', async ({ page }) => {
    const button = mainNav(page).getByRole('button', { name: 'About OGSERC' })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Tab')
    await expect(page.locator('#menu-about').getByRole('link').first()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
  })

  test('only one dropdown is open at a time, and clicking outside closes it', async ({ page }) => {
    const about = mainNav(page).getByRole('button', { name: 'About OGSERC' })
    const mandate = mainNav(page).getByRole('button', { name: 'Mandate' })
    await about.click()
    await mandate.click()
    await expect(about).toHaveAttribute('aria-expanded', 'false')
    await expect(mandate).toHaveAttribute('aria-expanded', 'true')

    await page.getByRole('heading', { name: 'Quick services' }).click()
    await expect(mandate).toHaveAttribute('aria-expanded', 'false')
  })

  test('has no WCAG 2.1 AA violations with a dropdown open', async ({ page }) => {
    await mainNav(page).getByRole('button', { name: 'Regulatory Instruments' }).click()
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Main menu on mobile (360px)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), 'Mobile menu is shown below 1024px')
    await page.goto('/')
  })

  test('shows a Menu button instead of the desktop menu bar', async ({ page }) => {
    await expect(mainNav(page).getByRole('button', { name: 'Menu' })).toBeVisible()
    await expect(mainNav(page).locator(':scope > ul')).toBeHidden()
  })

  test('opens, expands a section, and closes with Escape', async ({ page }) => {
    const menuButton = mainNav(page).getByRole('button', { name: 'Menu' })
    await menuButton.click()
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true')

    const panel = page.locator('#mobile-menu')
    for (const label of MENU_ITEMS) {
      await expect(panel.getByText(label, { exact: true })).toBeVisible()
    }

    const section = panel.getByRole('button', { name: 'Regulatory Instruments' })
    await section.click()
    await expect(section).toHaveAttribute('aria-expanded', 'true')
    const links = page.locator('#mobile-menu-regulatory-instruments').getByRole('link')
    await expect(links).toHaveCount(DROPDOWNS['Regulatory Instruments'])

    await links.first().focus()
    await page.keyboard.press('Escape')
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await expect(menuButton).toBeFocused()
    await expect(panel).toBeHidden()
  })

  test('has no WCAG 2.1 AA violations with the menu open', async ({ page }) => {
    await mainNav(page).getByRole('button', { name: 'Menu' }).click()
    await page.locator('#mobile-menu').getByRole('button', { name: 'About OGSERC' }).click()
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})
