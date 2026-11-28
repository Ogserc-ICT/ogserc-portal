import { expect, test } from '@playwright/test'

// FR-CON-01 Consumer Complaint (D-101). Its text is a CMS draft until OGSERC confirms the
// Regulations are approved, so the menu and footer links lead to its own address, which says
// "being prepared" and is kept out of search engines. The published page is tested against the
// test database (tests/e2e-db/consumer-complaint.spec.ts).

test('the footer link goes to /consumer-complaint, which is being prepared and not indexed', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Consumer Complaints' }).click()
  await expect(page).toHaveURL(/\/consumer-complaint$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This section is being prepared')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})
