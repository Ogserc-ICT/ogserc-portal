import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// D-063: Regulatory Instruments > Forms. The guide as text, forms A to K as Word downloads,
// then how to submit. The guide on the page must match OGSERC's source text exactly.

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const PAGE = '/regulatory-instruments/forms'
const FORMS_DIR = path.join(process.cwd(), 'public', 'forms', 'registration')
const GUIDE_SOURCE = path.join(process.cwd(), 'docs', 'source', 'registration-guide.md')
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const EMAIL = 'registration@ogserc.org.ng'

/** The guide's table rows and rules, read from OGSERC's verbatim source text. */
function guideSource() {
  const md = readFileSync(GUIDE_SOURCE, 'utf8')
  const rows = md
    .split('\n')
    .filter((line) => /^\| [A-K] \|/.test(line))
    .map((line) => {
      const [category, whoRegisters, code, fee] = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
      return { category, whoRegisters, code, fee }
    })
  const rules = md
    .split('### Rules for choosing')[1]
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2))
  return { rows, rules }
}

const formFiles = () =>
  readdirSync(FORMS_DIR)
    .filter((name) => name.endsWith('.docx'))
    .sort()

test.describe('Forms page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test('the menu links to the page, which has the title and an introduction', async ({ page }) => {
    await expect(page.getByRole('banner').locator(`a[href="${PAGE}"]`).first()).toBeAttached()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Forms')
    await expect(page.getByRole('link', { name: 'Order OGSERC/ORD/2026/001' })).toHaveAttribute(
      'href',
      '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001',
    )
    const nav = page.getByRole('navigation', { name: 'Instrument types' })
    await expect(nav.locator('[aria-current="page"]')).toHaveAccessibleName('Forms (11 documents)')
  })

  test('the guide comes before the forms, then how to submit', async ({ page }) => {
    const headings = page.getByRole('main').locator('h2:not(#instrument-types)')
    await expect(headings).toHaveText([
      'REGISTRATION FORM SELECTION GUIDE',
      'Registration forms',
      'How to submit',
    ])
    // Accessibility tree order, as a screen reader reads the page.
    const snapshot = await page.getByRole('main').ariaSnapshot()
    const guideAt = snapshot.indexOf('REGISTRATION FORM SELECTION GUIDE')
    const firstForm = snapshot.indexOf('REG-01A: Successor distribution companies')
    expect(guideAt).toBeGreaterThan(-1)
    expect(firstForm).toBeGreaterThan(guideAt)
  })

  test('the guide table matches the source row for row', async ({ page }) => {
    const { rows } = guideSource()
    expect(rows).toHaveLength(11)
    const table = page.getByRole('table')
    await expect(table).toHaveAccessibleName(
      'Which form to file under the OGSERC Commencement and Registration Order, 2026 (Schedule 3 categories)',
    )
    await expect(table.getByRole('columnheader')).toHaveCount(4)
    const bodyRows = table.getByRole('row').filter({ has: page.getByRole('rowheader') })
    await expect(bodyRows).toHaveCount(rows.length)
    for (const [i, row] of rows.entries()) {
      const cells = bodyRows.nth(i).getByRole('cell')
      await expect(bodyRows.nth(i).getByRole('rowheader')).toHaveText(row.category)
      await expect(cells.nth(0)).toHaveText(new RegExp(`${escape(row.whoRegisters)}$`))
      await expect(cells.nth(1).getByRole('link')).toHaveText(row.code)
      await expect(cells.nth(2)).toHaveText(new RegExp(`${escape(row.fee)}$`))
    }
  })

  test('the rules for choosing match the source, late-registration amounts included', async ({
    page,
  }) => {
    const { rules } = guideSource()
    const items = page.getByRole('list', { name: 'Rules for choosing' }).getByRole('listitem')
    await expect(items).toHaveText(rules)
    const late = page.getByText(/^Late registration:/)
    for (const amount of [
      '₦1,000,000 plus ₦200,000 a day (cap ₦20m)',
      '₦500,000 plus ₦100,000 a day (cap ₦10m)',
      '₦100,000 plus ₦10,000 a day (cap ₦2m)',
    ]) {
      await expect(late).toContainText(amount)
    }
  })

  test('the bank accounts sit between the guide table and the rules, in bold', async ({ page }) => {
    const payment = page.getByRole('region', { name: 'Payment details' })
    await expect(payment.getByRole('listitem')).toHaveCount(2)
    for (const text of [
      'OGUN STATE ELECTRICITY REGULATORY COMMISSION',
      '1313352257',
      'Zenith Bank',
      '0150934805',
      'Sterling Bank',
    ]) {
      const value = payment.getByText(text, { exact: true }).first()
      await expect(value).toBeVisible()
      expect(Number(await value.evaluate((el) => getComputedStyle(el).fontWeight))).toBe(700)
    }
    await expect(payment.getByRole('link', { name: /public notice/ })).toHaveAttribute(
      'href',
      '/media-center/notices/commencement-of-operations-and-mandatory-registration',
    )
    const snapshot = await page.getByRole('main').ariaSnapshot()
    const tableAt = snapshot.indexOf('REG-01K')
    const paymentAt = snapshot.indexOf('Payment details')
    const rulesAt = snapshot.indexOf('Rules for choosing')
    expect(tableAt).toBeLessThan(paymentAt)
    expect(paymentAt).toBeLessThan(rulesAt)
  })

  test('a form code in the guide jumps to that form', async ({ page }) => {
    await page.getByRole('table').getByRole('link', { name: 'REG-01C', exact: true }).click()
    await expect(page).toHaveURL(/#reg-01c$/)
    await expect(page.locator('#reg-01c')).toBeInViewport()
  })

  test('lists forms A to K in order, each with one Word download named by form and size', async ({
    page,
  }) => {
    const { rows } = guideSource()
    const entries = page.getByRole('region', { name: 'Registration forms' }).getByRole('article')
    await expect(entries).toHaveCount(11)
    const files = formFiles()
    for (const [i, row] of rows.entries()) {
      const entry = entries.nth(i)
      await expect(entry).toHaveAttribute('id', row.code.toLowerCase())
      await expect(entry).toContainText(`Category ${row.category}`)
      await expect(entry).toContainText(row.whoRegisters)
      await expect(entry).toContainText(row.fee)
      await expect(entry).toContainText('2026.1')
      const links = entry.getByRole('link')
      await expect(links).toHaveCount(1)
      const fileName = files.find((name) => name.includes(`_${row.code}_`))
      expect(fileName, row.code).toBeDefined()
      const kb = Math.round(statSync(path.join(FORMS_DIR, fileName!)).size / 1000)
      await expect(links).toHaveAccessibleName(
        new RegExp(`^Download ${row.code} \\(.+\\), Word, ${kb} KB$`),
      )
      await expect(links).toHaveAttribute('href', `/forms/registration/${fileName}`)
      await expect(links).toHaveAttribute('download', fileName!)
    }
  })

  test('the page offers exactly the files in public/forms/registration', async ({ page }) => {
    const hrefs = await page
      .locator('main a[download]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    expect(hrefs.map((href) => decodeURIComponent(path.basename(href))).sort()).toEqual(formFiles())
  })

  test('every download returns the Word file', async ({ page, request }) => {
    const hrefs = await page
      .locator('main a[download]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    expect(hrefs).toHaveLength(11)
    for (const href of hrefs) {
      const response = await request.get(href)
      expect(response.status(), href).toBe(200)
      expect(response.headers()['content-type'], href).toContain(DOCX)
      const body = await response.body()
      expect(body.length, href).toBe(
        statSync(path.join(FORMS_DIR, decodeURIComponent(path.basename(href)))).size,
      )
    }
  })

  test('how to submit gives the Registry and the email address, and nothing else', async ({
    page,
  }) => {
    const box = page.getByRole('region', { name: 'How to submit' })
    await expect(box).toContainText('5th and 6th Floors, OPIC Building, Oke-Ilewo, Abeokuta')
    await expect(box).toContainText('8:00am to 5:00pm')
    await expect(box).toContainText('2 November 2026')
    // The contact person is hidden until OGSERC names one (D-066).
    await expect(box).not.toContainText('Contact person')
    await expect(box).not.toContainText('[OGSERC to supply]')
    await expect(box.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`)
  })

  test('no portal, no PDF, no preview, no other email, no third-party link', async ({ page }) => {
    const main = page.getByRole('main')
    const text = (await main.innerText()).toLowerCase()
    expect(text).not.toContain('portal')
    expect(text).not.toContain('preview')
    await expect(main.locator('iframe, embed, object')).toHaveCount(0)
    const hrefs = await main
      .locator('a[href]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    expect(hrefs.filter((href) => /\.pdf(\?|#|$)/i.test(href))).toEqual([])
    // Nothing on the page links to the guide as a file: it is text only (D-063).
    expect(hrefs.filter((href) => /guide|docs\/source/i.test(href))).toEqual([])
    const external = hrefs.filter((href) => /^(https?:)?\/\//.test(href))
    expect(external).toEqual([])
    const mailto = hrefs.filter((href) => href.startsWith('mailto:'))
    expect(mailto).toEqual([`mailto:${EMAIL}`])
    const emails = new Set(text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) ?? [])
    expect([...emails]).toEqual([EMAIL])
  })

  test('link texts in the page content are unique', async ({ page }) => {
    const names = await page
      .getByRole('main')
      .locator('a[href]')
      .evaluateAll((links) => links.map((a) => (a.textContent ?? '').replace(/\s+/g, ' ').trim()))
    const duplicates = names.filter((name, i) => names.indexOf(name) !== i)
    expect(duplicates).toEqual([])
  })

  test('the guide and the download buttons work by keyboard', async ({ page }) => {
    const code = page.getByRole('table').getByRole('link', { name: 'REG-01E', exact: true })
    await code.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#reg-01e$/)
    // Sequential focus continues from the target: the next Tab reaches its download.
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('href', /REG-01E_/)
  })

  test('does not scroll sideways', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('has no WCAG 2.1 AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})

/** Escapes text for use inside a RegExp. */
function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
