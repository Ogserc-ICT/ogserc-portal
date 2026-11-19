import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// D-069: a news story's page, with its photographs in a grid that opens a viewer.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const PAGE = '/media-center/news/ogserc-visits-nerc'
const TITLE = 'OGSERC Visits NERC to Strengthen Regulatory Collaboration'

test.describe('News story', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test('shows the story, its date, highlights, the lead photo and six more', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE)
    const story = page.getByRole('article')
    await expect(page.getByRole('main').locator('time').first()).toHaveAttribute(
      'datetime',
      '2026-11-13',
    )
    await expect(story.getByRole('img', { name: /in front of the NERC logo/ })).toBeVisible()
    await expect(story).toContainText('Engr. Jide Onakoya')
    await expect(story).toContainText('Dr. Musiliu Oseni')
    await expect(story.getByRole('listitem').filter({ hasText: 'Capacity building:' })).toHaveCount(
      1,
    )
    const thumbnails = page.getByRole('region', { name: 'Photos' }).getByRole('link')
    await expect(thumbnails).toHaveCount(6)
  })

  test('the viewer opens, steps through the photos and returns focus on Escape', async ({
    page,
  }) => {
    const thumbnails = page.getByRole('region', { name: 'Photos' }).getByRole('link')
    await thumbnails.nth(1).click()
    const viewer = page.getByRole('dialog', { name: `Photos: ${TITLE}` })
    await expect(viewer).toBeVisible()
    await expect(viewer.getByText('Photo 2 of 6')).toBeVisible()
    await expect(viewer.getByRole('button', { name: 'Close photos' })).toBeFocused()

    await viewer.getByRole('button', { name: 'Next photo' }).click()
    await expect(viewer.getByText('Photo 3 of 6')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(viewer.getByText('Photo 6 of 6')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
    await expect(thumbnails.nth(1)).toBeFocused()
  })

  test('each thumbnail links to its full-size photo, so it works without JavaScript', async ({
    page,
  }) => {
    const href = await page
      .getByRole('region', { name: 'Photos' })
      .getByRole('link')
      .first()
      .getAttribute('href')
    expect(href).toMatch(/\/photo-2\.[^/]*jpg$/)
    expect((await page.request.get(href ?? '')).status()).toBe(200)
  })

  test('has no WCAG 2.1 AA violations, with the viewer closed or open', async ({ page }) => {
    const closed = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(closed.violations).toEqual([])
    await page.getByRole('region', { name: 'Photos' }).getByRole('link').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    // The viewer fades in over 200ms; mid-fade, axe measures its text against the white page.
    await expect(dialog).toHaveCSS('opacity', '1')
    const open = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(open.violations).toEqual([])
  })

  test('does not scroll sideways at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})

test('the News page links to the story', async ({ page }) => {
  await page.goto('/media-center/news')
  await page.getByRole('link', { name: TITLE }).click()
  await expect(page).toHaveURL(PAGE)
})

test('an unknown story is a 404', async ({ request }) => {
  expect((await request.get('/media-center/news/no-such-story')).status()).toBe(404)
})
