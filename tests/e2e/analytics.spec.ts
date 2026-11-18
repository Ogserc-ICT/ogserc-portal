import { expect, test } from '@playwright/test'

// FR-WEB-07, D-077. CI builds the site with a test website ID; a local run without
// UMAMI_WEBSITE_ID checks that no tracker is added instead.
const websiteId = process.env.UMAMI_WEBSITE_ID?.trim()

test.describe('Visitor statistics', () => {
  test.beforeEach(async ({ page }) => {
    // Umami does not run in tests. Answer for it so the tracker never reaches a real server.
    await page.route('**/pulse/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }),
    )
  })

  test('the tracker loads from the site itself, deferred and honouring Do Not Track', async ({
    page,
  }) => {
    test.skip(!websiteId, 'UMAMI_WEBSITE_ID is not set')
    await page.goto('/')
    const tracker = page.locator('script[data-website-id]')
    await expect(tracker).toHaveCount(1)
    await expect(tracker).toHaveAttribute('src', '/pulse/p.js')
    await expect(tracker).toHaveAttribute('data-website-id', websiteId!)
    await expect(tracker).toHaveAttribute('data-do-not-track', 'true')
    await expect(tracker).toHaveAttribute('defer', '')
  })

  test('no tracker is added when statistics are off', async ({ page }) => {
    test.skip(!!websiteId, 'UMAMI_WEBSITE_ID is set')
    await page.goto('/')
    await expect(page.locator('script[data-website-id]')).toHaveCount(0)
  })

  test('the admin panel is never tracked', async ({ page }) => {
    // The admin bundle is large; on the dev server its first load can exceed 30 seconds.
    test.slow()
    // The tracker is only in the public layout; Payload's admin has its own.
    const response = await page.goto('/admin')
    expect(response?.ok()).toBe(true)
    await expect(page.locator('script[data-website-id]')).toHaveCount(0)
  })
})
