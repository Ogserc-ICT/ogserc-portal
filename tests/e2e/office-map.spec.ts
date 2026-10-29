import { expect, test, type Page } from '@playwright/test'

// FR-CNT-01 / D-058: the office map loads from Google only when the visitor asks for it.

const contact = (page: Page) => page.locator('section[aria-labelledby="contact-heading"]')

test.describe('Office map', () => {
  test('nothing is fetched from Google until "Show map" is pressed', async ({ page }) => {
    const googleRequests: string[] = []
    // Never reach Google from the tests: answer the embed with an empty page.
    await page.route(/^https:\/\/www\.google\.com\//, (route) => {
      googleRequests.push(route.request().url())
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>map</title>' })
    })
    await page.goto('/')
    const map = contact(page)
    await map.scrollIntoViewIfNeeded()
    await expect(map.locator('iframe')).toHaveCount(0)
    await expect(map.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute(
      'href',
      /^https:\/\/maps\.app\.goo\.gl\//,
    )
    expect(googleRequests).toEqual([])

    await map.getByRole('button', { name: 'Show map' }).click()
    const frame = map.locator('iframe')
    await expect(frame).toHaveAttribute('title', /^Map: OGSERC head office/)
    await expect(frame).toBeFocused()
    await expect.poll(() => googleRequests.length).toBeGreaterThan(0)
  })

  test('without JavaScript, only the Google Maps link shows', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/')
    await expect(contact(page).getByRole('link', { name: 'Open in Google Maps' })).toBeVisible()
    await expect(contact(page).getByRole('button', { name: 'Show map' })).toHaveCount(0)
    await context.close()
  })
})
