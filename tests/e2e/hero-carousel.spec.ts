import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'

// FR-WEB-08 / D-037 / D-042: hero carousel with one pause/play control, a 5-second interval,
// and autoplay rules (reduced motion, hover, focus, pause).

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const INTERVAL = 5000 // HERO_INTERVAL_MS in HeroCarousel.tsx

const hero = (page: Page) => page.getByRole('region', { name: 'Highlights' })
const slide = (page: Page, n: number) => hero(page).getByRole('group', { name: `${n} of 3` })
const pauseButton = (page: Page) => hero(page).getByRole('button', { name: 'Pause slideshow' })
const playButton = (page: Page) => hero(page).getByRole('button', { name: 'Play slideshow' })
const activeSlide = (page: Page) =>
  hero(page).locator('[aria-roledescription="slide"]:not([inert])')
const slidesRegion = (page: Page) => hero(page).locator('[aria-live]')

/** The visible slide's label, for example "2 of 3". */
const activeLabel = (page: Page) => activeSlide(page).getAttribute('aria-label')

/** Moves the pointer off the hero, so hovering does not hold the slideshow. */
const pointerAway = (page: Page) => page.mouse.move(5, 5)

/**
 * Lets React finish rendering after a timer fired. React schedules renders with a MessageChannel,
 * which the fake clock does not control, so one MessageChannel round trip is enough.
 */
const settleReact = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => resolve()
        channel.port2.postMessage(null)
      }),
  )

test.describe('Hero carousel', () => {
  test('has one control: a pause/play button with a 44px target and a visible focus ring', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(hero(page).getByRole('button')).toHaveCount(1)
    await expect(pauseButton(page)).toBeVisible()

    const box = await pauseButton(page).boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)

    // Keyboard focus shows the gold outline (from the global :focus-visible rule).
    await page.keyboard.press('Tab') // skip link
    await pauseButton(page).focus()
    await expect(pauseButton(page)).toHaveCSS('outline-style', 'solid')
    await expect(pauseButton(page)).toHaveCSS('outline-width', '3px')
  })

  test('advances every 5 seconds, wrapping round', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await pointerAway(page)
    await expect(pauseButton(page)).toBeVisible() // hydrated: the interval is running
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 3')

    // Freeze the fake clock (a second ahead, so the target is never in the past), then step it
    // 100ms at a time and note when the slide changes.
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000)
    const changes: { at: number; label: string | null }[] = []
    const startLabel = await activeLabel(page)
    let current = startLabel
    for (let at = 100; at <= 16_000 && changes.length < 3; at += 100) {
      await page.clock.runFor(100)
      await settleReact(page)
      const label = await activeLabel(page)
      if (label !== current) changes.push({ at, label })
      current = label
    }

    // Each change moves to the next slide, wrapping from 3 back to 1.
    const next = (label: string | null) => `${(Number(label?.[0]) % 3) + 1} of 3`
    let previous = startLabel
    for (const change of changes) {
      expect(change.label).toBe(next(previous))
      previous = change.label
    }
    expect(changes).toHaveLength(3)
    expect(changes[0].at).toBeLessThanOrEqual(INTERVAL)
    expect(changes[1].at - changes[0].at).toBe(INTERVAL)
    expect(changes[2].at - changes[1].at).toBe(INTERVAL)
    // Hidden slides are inert, so their links cannot be focused or clicked.
    await expect(slide(page, 2)).toHaveAttribute('inert', '')
    await expect(slide(page, 3)).toHaveAttribute('inert', '')
  })

  test('Pause stops the slides until Play is pressed; aria-live follows', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await expect(slidesRegion(page)).toHaveAttribute('aria-live', 'off')

    await pauseButton(page).click()
    await expect(playButton(page)).toBeVisible()
    await expect(slidesRegion(page)).toHaveAttribute('aria-live', 'polite')
    await pointerAway(page)
    await page.clock.fastForward(INTERVAL * 4)
    expect(await activeLabel(page)).toBe('1 of 3')

    await playButton(page).click()
    await expect(pauseButton(page)).toBeVisible()
    await expect(slidesRegion(page)).toHaveAttribute('aria-live', 'off')
    await pointerAway(page)
    await page.clock.fastForward(INTERVAL)
    await expect.poll(() => activeLabel(page)).toBe('2 of 3')
  })

  test('hovering pauses it, and leaving resumes it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'Hover is a desktop pointer interaction')
    await page.clock.install()
    await page.goto('/')
    await expect(pauseButton(page)).toBeVisible()
    await hero(page).getByRole('heading', { level: 1 }).hover()
    await page.clock.fastForward(INTERVAL * 3)
    expect(await activeLabel(page)).toBe('1 of 3')
    // Hover is a temporary pause: the button still offers Pause.
    await expect(pauseButton(page)).toBeVisible()

    await pointerAway(page)
    await page.clock.fastForward(INTERVAL)
    await expect.poll(() => activeLabel(page)).toBe('2 of 3')
  })

  test('keyboard focus entering a slide stops it until Play is pressed', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await expect(pauseButton(page)).toBeVisible()
    await activeSlide(page).getByRole('link').focus()
    await expect(playButton(page)).toBeVisible()
    await expect(slidesRegion(page)).toHaveAttribute('aria-live', 'polite')
    await page.clock.fastForward(INTERVAL * 4)
    expect(await activeLabel(page)).toBe('1 of 3')

    await playButton(page).focus()
    await page.keyboard.press('Enter')
    await expect(pauseButton(page)).toBeFocused()
    await page.clock.fastForward(INTERVAL)
    await expect.poll(() => activeLabel(page)).toBe('2 of 3')
  })

  test('does not autoplay when the user prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    await page.goto('/')
    await expect(playButton(page)).toBeVisible()
    await expect(slidesRegion(page)).toHaveAttribute('aria-live', 'polite')
    await page.clock.fastForward(INTERVAL * 4)
    expect(await activeLabel(page)).toBe('1 of 3')
  })

  test('without JavaScript, slide 1 shows in full and there is no button', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 3')
    await expect(activeSlide(page).getByRole('link')).toBeVisible()
    await expect(hero(page).getByRole('button')).toHaveCount(0)
    await context.close()
  })

  test('only the first photo is in the initial HTML, preloaded', async ({ request }) => {
    const html = await (await request.get('/')).text()
    const heroImages = [...html.matchAll(/<img[^>]+hero-(\d)\.[^"]*\.jpg/g)].map((m) => m[1])
    expect(heroImages).toEqual(['1'])
    const preloads = [...html.matchAll(/<link[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => tag.includes('rel="preload"') && tag.includes('hero-'))
    expect(preloads).toHaveLength(1)
    expect(preloads[0]).toContain('hero-1')
  })

  test('serves the hero photo as AVIF or WebP with no metadata', async ({ page, request }) => {
    await page.goto('/')
    const src = await hero(page)
      .locator('img')
      .first()
      .evaluate((img: HTMLImageElement) => img.currentSrc)
    const response = await request.get(src, { headers: { accept: 'image/avif,image/webp,*/*' } })
    expect(response.headers()['content-type']).toMatch(/image\/(avif|webp)/)
    const body = await response.body()
    const meta = await sharp(body).metadata()
    expect({ exif: !!meta.exif, xmp: !!meta.xmp, iptc: !!meta.iptc }).toEqual({
      exif: false,
      xmp: false,
      iptc: false,
    })
    // Keep the hero light: the size a phone or desktop actually downloads.
    expect(body.length, `hero image is ${Math.round(body.length / 1024)} KB`).toBeLessThan(
      200 * 1024,
    )
  })

  for (const motion of ['no-preference', 'reduce'] as const) {
    test(`has no WCAG 2.1 AA violations (${motion} motion)`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: motion })
      await page.goto('/')
      const results = await new AxeBuilder({ page })
        .include('[aria-roledescription="carousel"]')
        .withTags(WCAG_21_AA)
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
})
