import { expect, test, type Page } from '@playwright/test'

// FR-WEB-10 / D-039: scroll-reveal and hover motion that never hides content, never shifts
// layout, and switches off for reduced-motion users.

const revealed = (page: Page) => page.locator('[data-reveal]')
const pendingCount = (page: Page) => page.locator('.reveal-pending').count()

/** Scrolls to the bottom in steps, then returns the page's cumulative layout shift. */
async function scrollAndMeasureLayoutShift(page: Page): Promise<number> {
  await page.evaluate(() => {
    const w = window as unknown as { cls: number }
    w.cls = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number
        hadRecentInput: boolean
      }[]) {
        if (!entry.hadRecentInput) w.cls += entry.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y <= height; y += 400) {
    await page.mouse.wheel(0, 400)
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(700)
  return page.evaluate(() => (window as unknown as { cls: number }).cls)
}

test.describe('Motion', () => {
  test('sections below the fold fade in as they scroll into view, with no layout shift', async ({
    page,
  }) => {
    await page.goto('/')
    await expect.poll(() => pendingCount(page)).toBeGreaterThan(0)

    // Nothing that was on screen at load is hidden.
    const onScreenHidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.reveal-pending')).some(
        (el) => el.getBoundingClientRect().top < window.innerHeight,
      ),
    )
    expect(onScreenHidden).toBe(false)

    const cls = await scrollAndMeasureLayoutShift(page)
    expect(cls, 'cumulative layout shift').toBeLessThan(0.01)
    expect(await pendingCount(page)).toBe(0)
    for (const section of await revealed(page).all()) {
      await expect(section).toHaveCSS('opacity', '1')
    }
  })

  test('cards lift gently on hover', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Hover is a desktop pointer interaction')
    await page.goto('/')
    const card = page.locator('section[aria-labelledby="latest-updates-heading"] article').first()
    await card.scrollIntoViewIfNeeded()
    await card.hover()
    // Tailwind v4 translate utilities set the `translate` property, not `transform`.
    await expect(card).not.toHaveCSS('translate', 'none')
  })

  test('with reduced motion: nothing is hidden, nothing lifts, transitions are instant', async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.waitForTimeout(500)
    expect(await pendingCount(page)).toBe(0)
    for (const section of await revealed(page).all()) {
      await expect(section).toHaveCSS('opacity', '1')
    }

    const card = page.locator('section[aria-labelledby="latest-updates-heading"] article').first()
    const duration = await card.evaluate((el) =>
      parseFloat(getComputedStyle(el).transitionDuration),
    )
    expect(duration).toBeLessThan(0.001)
    if (testInfo.project.name !== 'mobile') {
      await card.scrollIntoViewIfNeeded()
      await card.hover()
      await expect(card).toHaveCSS('translate', 'none')
    }
  })

  test('the reveal styles add no extra render-blocking stylesheet', async ({ request }) => {
    // A page-level CSS import becomes its own <link rel="stylesheet">, which delays first paint.
    const html = await (await request.get('/')).text()
    const stylesheets = html.match(/<link[^>]*rel="stylesheet"[^>]*>/g) ?? []
    expect(stylesheets, stylesheets.join('\n')).toHaveLength(1)
  })

  test('without JavaScript, every section is fully visible', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')
    expect(await revealed(page).count()).toBe(4)
    for (const section of await revealed(page).all()) {
      await expect(section).toHaveCSS('opacity', '1')
    }
    await context.close()
  })
})
