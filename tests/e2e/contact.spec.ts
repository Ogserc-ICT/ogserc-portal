import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { checkFormToken, issueFormToken } from '@/lib/contact/form-token'

// SRS 6.12 / D-059: contact page and enquiry form. Email sending is not set up yet, so a valid
// message ends with the "email us instead" notice.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// The server refuses forms sent within 3 seconds of opening the page (form-token.ts).
const MIN_FILL_MS = 3_100

const form = (page: Page) => page.getByRole('region', { name: 'Send a message' })

async function fillValid(page: Page) {
  await page.getByLabel('Full name').fill('Test Visitor')
  await page.getByLabel('Email address').fill('visitor@example.com')
  await page.getByLabel('Phone number').fill('+234 801 234 5678')
  await page.getByLabel('Subject').fill('Estimated bill')
  await page.getByLabel('Enquiry type').selectOption('Consumer complaint')
  await page
    .getByRole('textbox', { name: 'Message (required)' })
    .fill('My bill this month looks estimated.')
}

const send = (page: Page) => form(page).getByRole('button', { name: 'Send message' }).click()

test.describe('Contact page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact')
  })

  test('shows the office, department contacts and hours', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contact OGSERC')
    await expect(page.getByRole('main').getByText('Floors 5 & 6, OPIC Towers')).toBeVisible()
    await expect(page.getByRole('link', { name: '+234 813 772 0058' }).first()).toHaveAttribute(
      'href',
      'tel:+2348137720058',
    )
    await expect(
      page.getByRole('main').getByRole('link', { name: 'ccu@ogserc.org.ng' }),
    ).toHaveAttribute('href', 'mailto:ccu@ogserc.org.ng')
    await expect(
      page.getByRole('main').getByRole('link', { name: 'registration@ogserc.org.ng' }),
    ).toHaveAttribute('href', 'mailto:registration@ogserc.org.ng')
    await expect(page.getByText('8:00am to 5:00pm')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Show map' })).toBeVisible()
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })

  test('an empty form lists every missing field, and the list takes focus', async ({ page }) => {
    await send(page)
    const summary = page.getByRole('heading', { name: 'There is a problem' }).locator('..')
    await expect(summary).toBeFocused()
    await expect(summary.getByRole('link')).toHaveText([
      'Enter your full name',
      'Enter your email address',
      'Enter your message',
    ])
    await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Phone number')).not.toHaveAttribute('aria-invalid', 'true')
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })

  test('wrongly formatted email and phone are refused, and the values are kept', async ({
    page,
  }) => {
    await fillValid(page)
    await page.getByLabel('Email address').fill('visitor.example.com')
    await page.getByLabel('Phone number').fill('call me')
    await send(page)
    await expect(
      page.getByText(/^Enter an email address in the correct format/).first(),
    ).toBeVisible()
    await expect(page.getByText(/^Enter a phone number using digits/).first()).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Message (required)' })).toHaveValue(
      'My bill this month looks estimated.',
    )
    await expect(page.getByLabel('Enquiry type')).toHaveValue('Consumer complaint')
  })

  test('a form with a forged spam-check token is asked to send again', async ({ page }) => {
    await fillValid(page)
    await page.locator('input[name="token"]').evaluate((el: HTMLInputElement) => {
      el.value = `${Date.now() - 60_000}.forged`
    })
    await send(page)
    const notice = page.getByRole('status')
    await expect(notice).toHaveText('Please check your message and send it again.')
    await expect(notice).toBeFocused()
    await expect(page.getByLabel('Full name')).toHaveValue('Test Visitor')
    // The form now carries a fresh, genuine token.
    await expect(page.locator('input[name="token"]')).not.toHaveValue(/forged$/)
  })

  test('a valid message offers an email link carrying it, until sending is set up', async ({
    page,
  }) => {
    await fillValid(page)
    await page.waitForTimeout(MIN_FILL_MS)
    await send(page)
    const notice = page.getByRole('status')
    await expect(notice).toContainText('the online form cannot send messages yet')
    await expect(notice).toBeFocused()
    const href = await notice.getByRole('link', { name: 'Email your message' }).getAttribute('href')
    expect(href).toMatch(/^mailto:info@ogserc\.org\.ng\?subject=/)
    const mail = new URL(href ?? '')
    expect(mail.searchParams.get('subject')).toBe('Consumer complaint: Estimated bill')
    expect(mail.searchParams.get('body')).toContain('My bill this month looks estimated.')
    expect(mail.searchParams.get('body')).toContain('Phone: +234 801 234 5678')
  })

  test('a bot that fills the hidden trap field is told the message was sent', async ({ page }) => {
    await fillValid(page)
    await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
      el.value = 'https://spam.example'
    })
    await send(page)
    await expect(page.getByText('Thank you. Your message has been sent.')).toBeVisible()
  })
})

test.describe('Contact page without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the form still reports errors after a full page load', async ({ page }) => {
    await page.goto('/contact')
    await page.getByLabel('Full name').fill('Test Visitor')
    await send(page)
    await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByLabel('Full name')).toHaveValue('Test Visitor')
  })
})

test('the homepage "Contact page" button and the utility bar open the contact page', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Contact page' }).click()
  await expect(page).toHaveURL(/\/contact$/)
})

test.describe('Spam-check token', () => {
  test.beforeAll(() => {
    process.env.PAYLOAD_SECRET ??= 'test-only-secret-for-form-tokens'
  })

  test('refuses forms sent too soon, too late, or with a changed timestamp', () => {
    const issued = Date.UTC(2026, 9, 29, 12)
    const token = issueFormToken(issued)
    expect(checkFormToken(token, issued + 1_000)).toBe('too-fast')
    expect(checkFormToken(token, issued + 3_000)).toBe('ok')
    expect(checkFormToken(token, issued + 25 * 60 * 60 * 1000)).toBe('expired')
    const [, signature] = token.split('.')
    expect(checkFormToken(`${issued - 60_000}.${signature}`, issued + 3_000)).toBe('invalid')
    expect(checkFormToken('', issued)).toBe('invalid')
    expect(checkFormToken(undefined, issued)).toBe('invalid')
  })
})
