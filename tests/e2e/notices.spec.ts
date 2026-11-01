import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// D-065: Media Center > Public Notices, and the registration notice of 26 October 2026.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const LIST_PATH = '/media-center/notices'
const NOTICE_PATH = `${LIST_PATH}/commencement-of-operations-and-mandatory-registration`
const TITLE = 'Commencement of Operations and Mandatory Registration of Electricity Operators'

const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

for (const path of [LIST_PATH, NOTICE_PATH]) {
  test.describe(path, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path)
    })

    test('has no WCAG 2.1 AA violations', async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
      expect(results.violations).toEqual([])
    })

    test('does not scroll sideways at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 })
      expect(await sideways(page)).toBe(0)
    })
  })
}

test('the list links to the notice', async ({ page }) => {
  await page.goto(LIST_PATH)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Public Notices')
  await page.getByRole('link', { name: TITLE }).click()
  await expect(page).toHaveURL(new RegExp(`${NOTICE_PATH}$`))
})

test.describe('the registration notice', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(NOTICE_PATH)
  })

  test('shows the notice with its sections, as issued', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE)
    const notice = page.getByRole('article')
    await expect(notice.getByRole('heading', { level: 2 })).toHaveText([
      'The Commission has begun operations',
      'Who must register',
      'Key deadlines',
      'What to expect',
      'How to register',
      'Payment details',
    ])
    await expect(notice).toContainText('register within 60 days of 2 November 2026')
    await expect(notice).toContainText('Jide Onakoya, Chairman/CEO')
    // "licence" throughout, to match the Order (owner, 2026-11-01).
    await expect(notice).not.toContainText(/\blicense\b|\blicenses\b/)
  })

  test('shows both bank accounts digit for digit', async ({ page }) => {
    const payment = page.getByRole('region', { name: 'Payment details' })
    await expect(payment.getByRole('listitem')).toHaveCount(2)
    await expect(payment).toContainText('1313352257')
    await expect(payment).toContainText('Zenith Bank')
    await expect(payment).toContainText('0150934805')
    await expect(payment).toContainText('Sterling Bank')
  })

  test('links to the Order, the forms and the registration email', async ({ page }) => {
    await expect(
      page.getByRole('region', { name: TITLE }).getByRole('link', { name: 'OGSERC/ORD/2026/001' }),
    ).toHaveAttribute('href', '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001')
    await expect(page.getByRole('link', { name: 'Registration forms' })).toHaveAttribute(
      'href',
      '/regulatory-instruments/forms',
    )
    await expect(
      page.getByRole('article').getByRole('link', { name: 'registration@ogserc.org.ng' }).first(),
    ).toHaveAttribute('href', 'mailto:registration@ogserc.org.ng')
  })

  test('an unknown notice address is a 404', async ({ page }) => {
    const response = await page.goto(`${LIST_PATH}/no-such-notice`)
    expect(response?.status()).toBe(404)
  })
})

test('the Media Center menu links to Public Notices', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner').locator(`a[href="${LIST_PATH}"]`).first()).toHaveText(
    'Public Notices',
  )
})
