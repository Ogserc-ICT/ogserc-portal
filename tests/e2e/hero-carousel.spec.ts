import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'

// FR-WEB-08 / D-037: hero carousel controls, autoplay rules and image loading.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const hero = (page: Page) => page.getByRole('region', { name: 'Highlights' })
const slide = (page: Page, n: number) => hero(page).getByRole('group', { name: `${n} of 3` })
const pauseButton = (page: Page) => hero(page).getByRole('button', { name: 'Pause slideshow' })
const playButton = (page: Page) => hero(page).getByRole('button', { name: 'Play slideshow' })
const activeSlide = (page: Page) =>
  hero(page).locator('[aria-roledescription="slide"]:not([inert])')

/** The visible slide's label, for example "2 of 3". */
const activeLabel = (page: Page) => activeSlide(page).getAttribute('aria-label')

test.describe('Hero carousel', () => {
  test('previous, next and the indicators change the slide', async ({ page }) => {
    await page.goto('/')
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 3')

    await hero(page).getByRole('button', { name: 'Next slide' }).click()
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '2 of 3')
    await expect(hero(page).getByRole('button', { name: 'Show slide 2 of 3' })).toHaveAttribute(
      'aria-current',
      'true',
    )

    await hero(page).getByRole('button', { name: 'Previous slide' }).click()
    await hero(page).getByRole('button', { name: 'Previous slide' }).click()
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '3 of 3')

    await hero(page).getByRole('button', { name: 'Show slide 1 of 3' }).click()
    await expect(activeSlide(page)).toHaveAttribute('aria-label', '1 of 3')
    // Hidden slides are inert, so their links cannot be focused or clicked.
    await expect(slide(page, 2)).toHaveAttribute('inert', '')
  })

  test('autoplays, and the Pause button stops it until Play is pressed', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await expect(pauseButton(page)).toBeVisible()

    await page.clock.fastForward(7500)
    await expect.poll(() => activeLabel(page)).toBe('2 of 3')

    await pauseButton(page).click()
    await expect(playButton(page)).toBeVisible()
    await page.mouse.move(5, 5) // off the carousel, so only the Pause state holds it
    await page.clock.fastForward(20_000)
    expect(await activeLabel(page)).toBe('2 of 3')

    await playButton(page).click()
    await page.mouse.move(5, 5)
    await page.clock.fastForward(7500)
    await expect.poll(() => activeLabel(page)).toBe('3 of 3')
  })

  test('keyboard focus entering the carousel stops autoplay', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    await activeSlide(page).getByRole('link').focus()
    await expect(playButton(page)).toBeVisible()
    await page.clock.fastForward(20_000)
    expect(await activeLabel(page)).toBe('1 of 3')
  })

  test('does not autoplay when the user prefers reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    await page.goto('/')
    await expect(playButton(page)).toBeVisible()
    await page.clock.fastForward(20_000)
    expect(await activeLabel(page)).toBe('1 of 3')
  })

  test('without JavaScript, slide 1 shows in full and the controls are absent', async ({
    browser,
  }) => {
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

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .include('[aria-roledescription="carousel"]')
      .withTags(WCAG_21_AA)
      .analyze()
    expect(results.violations).toEqual([])
  })
})
