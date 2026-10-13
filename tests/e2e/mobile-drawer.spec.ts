import { expect, test, type Page } from '@playwright/test'

// D-036: below lg, a compact header (logo, crest, Menu button) and a menu drawer from the left.

const menuButton = (page: Page) => page.getByRole('button', { name: 'Menu', exact: true })
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Menu' })
const closeButton = (page: Page) => drawer(page).getByRole('button', { name: 'Close menu' })

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

test.describe('Mobile header and drawer', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The drawer is used below 1024px')
    await page.goto('/')
  })

  for (const width of [320, 360]) {
    test(`the header at ${width}px shows the logo, crest and Menu button only, without overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 780 })
      const header = page.locator('header')
      await expect(header.getByRole('link', { name: /OGSERC.*home/ })).toBeVisible()
      await expect(header.getByRole('img', { name: 'Ogun State Government crest' })).toBeVisible()
      await expect(menuButton(page)).toBeVisible()
      await expect(
        header.getByText('Ogun State Electricity Regulatory Commission', { exact: true }),
      ).toBeHidden()
      await expect(page.getByRole('navigation', { name: 'Utility' })).toHaveCount(0)
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0)
    })
  }

  test('opens with focus inside, and the Menu button reports it', async ({ page }) => {
    await menuButton(page).click()
    await expect(drawer(page)).toBeVisible()
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(closeButton(page)).toBeFocused()
    // It slides in from the left edge.
    await expect.poll(async () => (await drawer(page).boundingBox())?.x).toBe(0)
  })

  test('traps focus: Tab and Shift+Tab wrap inside the drawer', async ({ page }) => {
    await menuButton(page).click()
    await expect(closeButton(page)).toBeFocused()

    await page.keyboard.press('Shift+Tab')
    const search = drawer(page).getByRole('link', { name: 'Search' })
    await expect(search).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(closeButton(page)).toBeFocused()

    // Walk forwards through every control; focus never leaves the drawer.
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('#mobile-menu'))).toBe(
        true,
      )
    }
  })

  test('Escape closes it and returns focus to the Menu button', async ({ page }) => {
    await menuButton(page).click()
    await page.keyboard.press('Escape')
    await expect(drawer(page)).toBeHidden()
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(menuButton(page)).toBeFocused()
  })

  test('the close button and a backdrop click close it', async ({ page }) => {
    await menuButton(page).click()
    await closeButton(page).click()
    await expect(drawer(page)).toBeHidden()
    await expect(menuButton(page)).toBeFocused()

    await menuButton(page).click()
    await expect(drawer(page)).toBeVisible()
    await page.mouse.click(350, 400) // right of the drawer, on the dimmed backdrop
    await expect(drawer(page)).toBeHidden()
    await expect(menuButton(page)).toBeFocused()
  })

  test('locks page scrolling while open and restores it on close', async ({ page }) => {
    await menuButton(page).click()
    await expect(drawer(page)).toBeVisible()
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
      'hidden',
    )
    await page.mouse.move(350, 400)
    await page.mouse.wheel(0, 800)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    await page.keyboard.press('Escape')
    await page.mouse.wheel(0, 800)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })

  test('a link in the drawer navigates and closes it', async ({ page }) => {
    await menuButton(page).click()
    await drawer(page).getByRole('link', { name: 'Contact Us' }).click()
    await expect(page).toHaveURL(/\/being-prepared$/)
    await expect(drawer(page)).toBeHidden()
  })

  test('works without the slide animation (no @starting-style or allow-discrete)', async ({
    page,
  }) => {
    // A browser without @starting-style or `transition-behavior: allow-discrete` runs no
    // transition at all (an unknown keyword drops the whole declaration). Removing the
    // transitions reproduces that: the drawer must be fully open, then fully gone, at once.
    await page.addStyleTag({
      content: '.drawer, .drawer::backdrop { transition: none !important; }',
    })
    await menuButton(page).click()
    const box = await drawer(page).boundingBox()
    expect(box?.x).toBe(0)
    expect(box?.width).toBeGreaterThan(250)
    await expect(closeButton(page)).toBeFocused()

    await page.keyboard.press('Escape')
    expect(await drawer(page).isVisible()).toBe(false)
    await expect(menuButton(page)).toBeFocused()
  })
})
