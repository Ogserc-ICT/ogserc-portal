import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { waitForSettledPage } from './support/settle'

// FR-WEB-13 / D-043: floating "Back to top" button, enhancing the footer's plain link.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// For state checks: the button is out of the accessibility tree while hidden.
const floating = (page: Page) => page.locator('.back-to-top')
const button = (page: Page) => page.getByRole('button', { name: 'Back to top' })
const footerLink = (page: Page) =>
  page.getByRole('contentinfo').getByRole('link', { name: 'Back to top' })
const skipLink = (page: Page) => page.getByRole('link', { name: 'Skip to main content' })
// The skip link appears only when it matches :focus-visible (keyboard focus).
const skipLinkShown = (page: Page) => skipLink(page).evaluate((el) => el.matches(':focus-visible'))

const scrollToY = (page: Page, y: number) =>
  page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
const scrollY = (page: Page) => page.evaluate(() => window.scrollY)
const viewportHeight = (page: Page) => page.evaluate(() => window.innerHeight)

/** Scrolls one and a half viewports down, where the button shows (the footer is still below). */
async function scrollPastFirstScreen(page: Page) {
  await scrollToY(page, Math.round((await viewportHeight(page)) * 1.5))
  await expect(button(page)).toBeVisible()
}

/**
 * What D-043 guarantees the button never covers: the hero's pause button and every link and button
 * in the header and footer. Main content is not included: the button floats over it mid-page, as
 * any floating button does, so what lies under it depends on the page's content.
 */
const NEVER_COVERED = '[data-rotation-control], header a, header button, footer a, footer button'

/** Visible matches of `selector` (other than the floating button) whose boxes meet the button's box. */
const overlapsWithButton = (page: Page, selector = 'a, button') =>
  page.evaluate((selector) => {
    const own = document.querySelector('.back-to-top')!
    if (getComputedStyle(own).visibility === 'hidden' || getComputedStyle(own).display === 'none') {
      return []
    }
    const b = own.getBoundingClientRect()
    return Array.from(document.querySelectorAll<HTMLElement>(selector))
      .filter((el) => el !== own && el.checkVisibility({ visibilityProperty: true }))
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return (
          r.width > 1 &&
          r.left < b.right &&
          r.right > b.left &&
          r.top < b.bottom &&
          r.bottom > b.top
        )
      })
      .map((el) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? el.tagName)
  }, selector)

test.describe('Back to top', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // The Next.js dev-tools badge (development only) is fixed over the bottom-left corner.
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  })

  test('is hidden at the top of the page and appears after scrolling', async ({ page }) => {
    await expect(floating(page)).toBeHidden()
    await scrollPastFirstScreen(page)
    // Back near the top, it hides again.
    await scrollToY(page, 0)
    await expect(floating(page)).toBeHidden()
  })

  test('a click returns to the top and moves focus to the skip link, quietly', async ({ page }) => {
    await scrollPastFirstScreen(page)
    await button(page).click()
    await expect.poll(() => scrollY(page)).toBe(0)
    await expect(skipLink(page)).toBeFocused()
    // After a pointer click the skip link takes focus without appearing (focus-visible only).
    expect(await skipLinkShown(page)).toBe(false)
    await expect(floating(page)).toBeHidden()
  })

  for (const key of ['Enter', 'Space']) {
    test(`works with the keyboard: Tab to it, then ${key}`, async ({ page }) => {
      await scrollPastFirstScreen(page)
      // Start from the last link in the main content without scrolling the page.
      await page.evaluate(() => {
        const links = document.querySelectorAll<HTMLElement>('main a, main button')
        links[links.length - 1].focus({ preventScroll: true })
      })
      await page.keyboard.press('Tab')
      await expect(button(page)).toBeFocused()
      await page.keyboard.press(key)
      await expect.poll(() => scrollY(page)).toBe(0)
      await expect(skipLink(page)).toBeFocused()
      // Keyboard users see where focus went.
      expect(await skipLinkShown(page)).toBe(true)
      expect((await skipLink(page).boundingBox())?.width).toBeGreaterThan(100)
    })
  }

  test('scrolls smoothly, or jumps instantly for reduced motion', async ({ page }) => {
    // Record the behaviour requested from window.scrollTo.
    await page.evaluate(() => {
      const calls: (ScrollToOptions | undefined)[] = []
      const original = window.scrollTo.bind(window)
      Object.assign(window, {
        scrollCalls: calls,
        scrollTo: (options?: ScrollToOptions) => {
          calls.push(options)
          original(options)
        },
      })
    })
    const lastBehaviour = () =>
      page.evaluate(
        () =>
          (window as unknown as { scrollCalls: ScrollToOptions[] }).scrollCalls.at(-1)?.behavior,
      )

    await scrollPastFirstScreen(page)
    await button(page).click()
    expect(await lastBehaviour()).toBe('smooth')
    await expect.poll(() => scrollY(page)).toBe(0)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await scrollPastFirstScreen(page)
    await button(page).click()
    expect(await lastBehaviour()).toBe('instant')
    // Already at the top: no animation to wait for.
    expect(await scrollY(page)).toBe(0)
  })

  test('is hidden while the menu drawer is open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'The drawer is used below 1024px')
    await scrollPastFirstScreen(page)
    await page.evaluate(() =>
      (document.getElementById('mobile-menu') as HTMLDialogElement).showModal(),
    )
    await expect(floating(page)).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
    // Closing returns focus to the Menu button at the top; scroll down again and it is back.
    await scrollPastFirstScreen(page)
  })

  test('is hidden when printing, as is the footer link', async ({ page }) => {
    await scrollPastFirstScreen(page)
    await page.emulateMedia({ media: 'print' })
    await expect(floating(page)).toBeHidden()
    await expect(footerLink(page)).toBeHidden()
  })

  for (const width of [360, 1280]) {
    test(`at ${width}px it never covers the pause button or any footer link`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await scrollToY(page, 0)
      await expect(floating(page)).toBeHidden()

      // Step down to the first position where it shows: it is clear of the hero's pause button.
      const height = await viewportHeight(page)
      let y = height - 100
      while (!(await floating(page).isVisible()) && y < height * 2) {
        y += 20
        await scrollToY(page, y)
        await page.waitForTimeout(50)
      }
      await expect(button(page)).toBeVisible()
      const pause = await page.locator('[data-rotation-control]').boundingBox()
      const own = await button(page).boundingBox()
      expect(pause && own).toBeTruthy()
      expect(own!.y).toBeGreaterThan(pause!.y + pause!.height)
      expect(await overlapsWithButton(page, NEVER_COVERED)).toEqual([])

      // At the very bottom the footer is in view: the button gives way to the footer's own link.
      await scrollToY(page, await page.evaluate(() => document.documentElement.scrollHeight))
      await expect(floating(page)).toBeHidden()
      await expect(footerLink(page)).toBeVisible()
      expect(await overlapsWithButton(page)).toEqual([])

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  // Runs at 360px (mobile project) and 1280px (desktop project), on a fully settled page.
  test('has no WCAG 2.1 AA violations while showing', async ({ page }) => {
    await scrollPastFirstScreen(page)
    await waitForSettledPage(page)
    await expect(button(page)).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Back to top without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the footer link returns to the top; the floating button stays hidden', async ({ page }) => {
    await page.goto('/')
    await scrollToY(page, await page.evaluate(() => document.documentElement.scrollHeight))
    await expect(floating(page)).toBeHidden()
    await footerLink(page).click()
    await expect(page).toHaveURL(/#top$/)
    await expect.poll(() => scrollY(page)).toBe(0)
  })
})
