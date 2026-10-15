import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { waitForSettledPage } from './support/settle'

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test.describe('Smoke', () => {
  test('homepage loads with a heading', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/OGSERC/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('homepage has no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/')
    // The pause/play button renders after hydration; then every section is faded in and settled,
    // so axe checks all of them at full opacity.
    await expect(page.getByRole('button', { name: /slideshow/ })).toBeVisible()
    await waitForSettledPage(page)
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })

  test('responses carry baseline security headers', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()
    expect(headers['strict-transport-security']).toContain('max-age=')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toContain('camera=()')
    expect(headers['x-powered-by']).toBeUndefined()
  })

})

test.describe('Smoke: admin', () => {
  // Warm-up: a dev server compiles each route and client chunk on first use. Cold, the admin
  // page took about 40s, the /api/users/me call it makes about 11s more, and the login view a
  // further lazy chunk. One browser visit first compiles all of it, so the test and its
  // assertions keep their normal timeouts. Against a production build the visit is quick.
  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(180_000)
    const page = await browser.newPage({ baseURL })
    await page.goto('/admin')
    await page.waitForURL(/\/admin\/(login|create-first-user)/, { timeout: 170_000 })
    await page.close()
  })

  test('admin panel responds', async ({ page }) => {
    const response = await page.goto('/admin')
    expect(response?.ok()).toBe(true)
    // An empty database shows the first-user screen; otherwise the login screen.
    await expect(page).toHaveURL(/\/admin\/(login|create-first-user)/)
  })
})
