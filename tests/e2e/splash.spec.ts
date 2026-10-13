import { expect, test, type Page } from '@playwright/test'

// FR-WEB-09 / D-038: logo splash once per session, gone within about 800ms, never for
// reduced-motion users or without JavaScript, and harmless when storage is blocked.

const splash = (page: Page) => page.locator('.splash-screen')
const htmlClasses = (page: Page) => page.evaluate(() => document.documentElement.className)

test.describe('Splash', () => {
  test('shows on the first page of a session, ends on load or by 800ms, and not again', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(await htmlClasses(page)).toContain('splash')

    // The hard cap is a CSS animation (immune to a busy main thread): fade from 600ms to 800ms.
    // Checked as a contract, because wall-clock timing on a test machine is not reliable.
    const animation = await splash(page).evaluate((el) => {
      const style = getComputedStyle(el)
      return [style.animationName, style.animationDelay, style.animationDuration].join(' ')
    })
    if (!(await htmlClasses(page)).includes('splash-done')) {
      expect(animation).toBe('splash-fade-out 0.6s 0.2s')
    }

    // It ends as soon as the page has loaded.
    await page.waitForLoadState('load')
    expect(await htmlClasses(page)).toContain('splash-done')
    await expect(splash(page)).toBeHidden({ timeout: 1000 })

    await page.goto('/being-prepared')
    expect(await htmlClasses(page)).not.toContain('splash')
    await expect(splash(page)).toBeHidden()
  })

  test('does not lower the priority of the header logo preload', async ({ request }) => {
    // The splash renders the same logo first; React keeps only the first preload for a URL.
    const html = await (await request.get('/')).text()
    const logoPreloads = [...html.matchAll(/<link[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => tag.includes('rel="preload"') && tag.includes('ogserc-wordmark'))
    expect(logoPreloads).toHaveLength(1)
    expect(logoPreloads[0]).toContain('fetchPriority="high"')
  })

  test('never blocks the pointer while it is showing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(await splash(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
  })

  test('is skipped for users who prefer reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    expect(await htmlClasses(page)).not.toContain('splash')
    await expect(splash(page)).toBeHidden()
  })

  test('is skipped without JavaScript, and the content is in the HTML', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')
    await expect(splash(page)).toBeHidden()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Quick services' })).toBeVisible()
    await context.close()
  })

  test('with session storage blocked: no splash, no errors, and the hero still works', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new DOMException('Storage is disabled', 'SecurityError')
        },
      })
    })
    await page.goto('/')
    expect(await htmlClasses(page)).not.toContain('splash')
    await expect(splash(page)).toBeHidden()

    const hero = page.getByRole('region', { name: 'Highlights' })
    await hero.getByRole('button', { name: 'Next slide' }).click()
    await expect(hero.locator('[aria-roledescription="slide"]:not([inert])')).toHaveAttribute(
      'aria-label',
      '2 of 3',
    )
    expect(errors).toEqual([])
  })
})
