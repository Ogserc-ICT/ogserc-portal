import { expect, test, type Page } from '@playwright/test'

// D-035: desktop dropdowns open on hover (where the device can hover) and on click, Enter and
// Space; WCAG 1.4.13 (hoverable, persistent, dismissible).

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' })
const about = (page: Page) => mainNav(page).getByRole('button', { name: 'About OGSERC' })
const aboutPanel = (page: Page) => page.locator('#menu-about')

/** Moves the pointer well away from the menu. */
const moveAway = (page: Page) => page.mouse.move(640, 700)

test.describe('Desktop menu: hover and keyboard (1280px)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Desktop menu is shown from 1024px')
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
  })

  test('hover opens a dropdown, the panel stays open under the pointer, and leaving closes it', async ({
    page,
  }) => {
    await about(page).hover()
    await expect(about(page)).toHaveAttribute('aria-expanded', 'true')

    // Hoverable: moving from the button into the panel keeps it open.
    const lastLink = aboutPanel(page).getByRole('link').last()
    await lastLink.hover()
    await page.waitForTimeout(500)
    await expect(about(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(lastLink).toBeVisible()

    await moveAway(page)
    await expect(about(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('a click on a hover-opened dropdown pins it open', async ({ page }) => {
    await about(page).hover()
    await expect(about(page)).toHaveAttribute('aria-expanded', 'true')
    await about(page).click()
    await moveAway(page)
    await page.waitForTimeout(600)
    await expect(about(page)).toHaveAttribute('aria-expanded', 'true')

    await about(page).click()
    await expect(about(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('Escape dismisses a hover-opened dropdown, and hover does not reopen it until the pointer leaves', async ({
    page,
  }) => {
    const box = await about(page).boundingBox()
    if (!box) throw new Error('menu button has no box')
    await about(page).hover()
    await expect(about(page)).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Escape')
    await expect(about(page)).toHaveAttribute('aria-expanded', 'false')

    // Small movements over the same button must not reopen it.
    await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2)
    await page.waitForTimeout(400)
    await expect(about(page)).toHaveAttribute('aria-expanded', 'false')

    await moveAway(page)
    await about(page).hover()
    await expect(about(page)).toHaveAttribute('aria-expanded', 'true')
  })

  test('Space and Enter toggle a dropdown without a pointer', async ({ page }) => {
    await about(page).focus()
    await page.keyboard.press('Space')
    await expect(about(page)).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Enter')
    await expect(about(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('hovering another item moves the open dropdown to it', async ({ page }) => {
    const mandate = mainNav(page).getByRole('button', { name: 'Mandate' })
    await about(page).hover()
    await mandate.hover()
    await expect(mandate).toHaveAttribute('aria-expanded', 'true')
    await expect(about(page)).toHaveAttribute('aria-expanded', 'false')
  })
})

test('on a touch screen, a tap opens a dropdown and it stays open', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Runs once, in the desktop project')
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()
  await page.goto('/')
  await about(page).tap()
  await expect(about(page)).toHaveAttribute('aria-expanded', 'true')
  await page.waitForTimeout(600)
  await expect(about(page)).toHaveAttribute('aria-expanded', 'true')
  await context.close()
})
