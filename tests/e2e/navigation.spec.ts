import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// SRS Section 4: the seven main-menu items, and how many links each dropdown holds.
const MENU_ITEMS = [
  'About OGSERC',
  'Regulatory Instruments',
  'Mandate',
  'Consumer Complaint',
  'Media Center',
  'Resources',
  'User Profile',
]
const DROPDOWNS: Record<string, number> = {
  'About OGSERC': 4,
  'Regulatory Instruments': 11,
  Mandate: 4,
  'Media Center': 4,
  Resources: 6,
}

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' })
const menuButton = (page: Page) => page.getByRole('button', { name: 'Menu', exact: true })
const isMobile = (projectName: string) => projectName === 'mobile'

type OverflowReport = {
  overflow: number
  viewport: number
  offenders: { tag: string; className: string; text: string; by: number }[]
  font: { family: string; publicSansLoaded: boolean; status: string }
}

/**
 * Runs in the browser. Measures how far the page is wider than the viewport and lists the
 * elements whose right edge goes past it. Elements inside a clipping or scrolling ancestor are
 * skipped, because they cannot widen the page. Also reports whether the web font is in use, since
 * text width depends on it.
 */
function measureHorizontalOverflow(): OverflowReport {
  const viewport = document.documentElement.clientWidth
  const isClipped = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') return true
    }
    return false
  }

  const offenders: OverflowReport['offenders'] = []
  for (const el of document.body.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect()
    const by = Math.round((rect.right + window.scrollX - viewport) * 10) / 10
    if (rect.width > 0 && by > 0 && !isClipped(el)) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        className: el.getAttribute('class') ?? '',
        text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
        by,
      })
    }
  }
  offenders.sort((a, b) => b.by - a.by)

  const menuItem = document.querySelector('nav[aria-label="Main"] > ul > li > *')
  return {
    overflow: document.documentElement.scrollWidth - viewport,
    viewport,
    offenders: offenders.slice(0, 20),
    font: {
      family: menuItem ? getComputedStyle(menuItem).fontFamily : '(menu item not found)',
      publicSansLoaded: document.fonts.check('600 16px "Public Sans"'),
      status: document.fonts.status,
    },
  }
}

// A deliberately wide stand-in for a system fallback font. Verdana (Windows) and DejaVu Sans
// (Linux) are both much wider than Public Sans; the extra letter spacing keeps the test strict
// even if neither is installed.
const WIDE_FALLBACK_CSS = `nav[aria-label="Main"] * {
  font-family: Verdana, 'DejaVu Sans', sans-serif !important;
  letter-spacing: 0.04em !important;
}`

/** Runs in the browser: how many lines each menu label's text occupies. */
function countLabelLines(items: Element[]): number[] {
  return items.map((item) => {
    const tops = new Set<number>()
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) tops.add(Math.round(rect.top))
    }
    return tops.size
  })
}

function describeOverflow({ overflow, viewport, offenders, font }: OverflowReport): string {
  const selector = (o: OverflowReport['offenders'][number]) =>
    o.className ? `${o.tag}.${o.className.trim().split(/\s+/).join('.')}` : o.tag
  const lines = offenders.map((o) => `  ${selector(o)} +${o.by}px  "${o.text}"`)
  return [
    `Page is ${overflow}px wider than the ${viewport}px viewport.`,
    `Elements past the right edge (largest first):`,
    ...(lines.length ? lines : ['  (none outside clipping containers)']),
    `Menu font: ${font.family}; Public Sans loaded: ${font.publicSansLoaded}; document.fonts.status: ${font.status}`,
  ].join('\n')
}

test.describe('Utility bar, footer, and placeholder pages', () => {
  test('utility links are Contact Us, Licences, FAQs, Search', async ({ page }, testInfo) => {
    await page.goto('/')
    // Desktop shows them in the utility bar; below lg they are in the menu drawer (D-036).
    if (isMobile(testInfo.project.name)) await menuButton(page).click()
    const utility = page.getByRole('navigation', { name: 'Utility' })
    await expect(utility.getByRole('link')).toHaveText(['Contact Us', 'Licences', 'FAQs', 'Search'])
  })

  test('search goes to the shared "being prepared" page, which has breadcrumbs', async ({
    page,
  }, testInfo) => {
    await page.goto('/')
    if (isMobile(testInfo.project.name)) await menuButton(page).click()
    await page
      .getByRole('navigation', { name: 'Utility' })
      .getByRole('link', { name: 'Search' })
      .click()
    await expect(page).toHaveURL(/\/being-prepared$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'This section is being prepared',
    )
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
    await expect(breadcrumb.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
      'This section is being prepared',
    )
  })

  test('footer has the legal page links (FR-WEB-06)', async ({ page }) => {
    await page.goto('/')
    const legal = page.getByRole('navigation', { name: 'Legal' })
    await expect(legal.getByRole('link')).toHaveText([
      'Privacy Policy',
      'Terms of Service',
      'Cookie Notice',
      'Accessibility Statement',
      'Sitemap',
    ])
  })

  test('every link in the header and footer resolves', async ({ page, request }) => {
    await page.goto('/')
    const hrefs = await page
      .locator('header a[href], footer a[href]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
    // Site links are fetched; email, phone and social links are only checked for their form,
    // so the test never depends on another site being reachable.
    for (const href of new Set(hrefs)) {
      if (/^(mailto:|tel:\+\d+$|https:\/\/)/.test(href)) continue
      const response = await request.get(href)
      expect(response.status(), href).toBe(200)
    }
  })

  test('the footer links to email, phone and every social account', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: 'info@ogserc.org.ng' })).toHaveAttribute(
      'href',
      'mailto:info@ogserc.org.ng',
    )
    await expect(footer.getByRole('link', { name: '+234 813 772 0058' })).toHaveAttribute(
      'href',
      'tel:+2348137720058',
    )
    for (const network of ['LinkedIn', 'Facebook', 'Instagram', 'X', 'TikTok']) {
      const link = footer.getByRole('link', { name: `OGSERC on ${network}`, exact: true })
      await expect(link).toHaveAttribute('href', /^https:\/\//)
    }
  })

  for (const path of ['/being-prepared', '/design-system']) {
    test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
      expect(results.violations).toEqual([])
    })
  }
})

test.describe('Main menu on desktop', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), 'Desktop menu is shown from 1024px')
    await page.goto('/')
  })

  test('shows the seven SRS menu items and no Menu button', async ({ page }) => {
    const items = mainNav(page).locator(':scope > ul > li > :first-child')
    await expect(items).toHaveText(MENU_ITEMS)
    await expect(menuButton(page)).toBeHidden()
  })

  for (const [label, count] of Object.entries(DROPDOWNS)) {
    test(`"${label}" dropdown opens on click with ${count} links`, async ({ page }) => {
      const button = mainNav(page).getByRole('button', { name: label })
      await expect(button).toHaveAttribute('aria-expanded', 'false')
      await button.click()
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      const panel = page.locator(`#${await button.getAttribute('aria-controls')}`)
      await expect(panel.getByRole('link')).toHaveCount(count)
      await expect(panel.getByRole('link').first()).toBeVisible()
    })
  }

  test('the menu bar fits at 1024px, the narrowest desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    const report = await page.evaluate(measureHorizontalOverflow)
    expect(report.overflow, describeOverflow(report)).toBeLessThanOrEqual(0)
  })

  test('the menu bar fits at 1024px even with a wide fallback font', async ({ page }) => {
    // Worst case for real visitors: Public Sans has not loaded (slow connection, or blocked) and
    // the system fallback is much wider than Arial, as on Linux and Android (D-032).
    await page.route(/\.woff2?$/, (route) => route.abort())
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/')
    await page.addStyleTag({ content: WIDE_FALLBACK_CSS })

    const report = await page.evaluate(measureHorizontalOverflow)
    expect(report.font.publicSansLoaded, 'the web font should be blocked in this test').toBe(false)
    expect(report.overflow, describeOverflow(report)).toBeLessThanOrEqual(0)

    const lines = await mainNav(page)
      .locator(':scope > ul > li > :first-child')
      .evaluateAll(countLabelLines)
    expect(Math.max(...lines), 'the wide font should make at least one label wrap').toBeGreaterThan(
      1,
    )
    expect(Math.max(...lines), `label line counts: ${lines.join(', ')}`).toBeLessThanOrEqual(2)
  })

  test('dropdowns work with the keyboard and close with Escape', async ({ page }) => {
    const button = mainNav(page).getByRole('button', { name: 'About OGSERC' })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Tab')
    await expect(page.locator('#menu-about').getByRole('link').first()).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
  })

  test('only one dropdown is open at a time, and clicking outside closes it', async ({ page }) => {
    const about = mainNav(page).getByRole('button', { name: 'About OGSERC' })
    const mandate = mainNav(page).getByRole('button', { name: 'Mandate' })
    await about.click()
    await mandate.click()
    await expect(about).toHaveAttribute('aria-expanded', 'false')
    await expect(mandate).toHaveAttribute('aria-expanded', 'true')

    await page.getByRole('heading', { name: 'Quick services' }).click()
    await expect(mandate).toHaveAttribute('aria-expanded', 'false')
  })

  test('has no WCAG 2.1 AA violations with a dropdown open', async ({ page }) => {
    await mainNav(page).getByRole('button', { name: 'Regulatory Instruments' }).click()
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})

test.describe('Main menu on mobile (360px)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), 'The drawer is used below 1024px')
    await page.goto('/')
  })

  test('shows a Menu button instead of the desktop menu bar and utility bar', async ({ page }) => {
    await expect(menuButton(page)).toBeVisible()
    await expect(mainNav(page)).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Utility' })).toHaveCount(0)
  })

  test('the drawer lists the seven items and expands a section', async ({ page }) => {
    await menuButton(page).click()
    const drawer = page.getByRole('dialog', { name: 'Menu' })
    await expect(drawer).toBeVisible()
    for (const label of MENU_ITEMS) {
      await expect(drawer.getByText(label, { exact: true })).toBeVisible()
    }

    const section = drawer.getByRole('button', { name: 'Regulatory Instruments' })
    await section.click()
    await expect(section).toHaveAttribute('aria-expanded', 'true')
    const links = page.locator('#mobile-menu-regulatory-instruments').getByRole('link')
    await expect(links).toHaveCount(DROPDOWNS['Regulatory Instruments'])
    await expect(links.first()).toBeVisible()
  })

  test('has no WCAG 2.1 AA violations with the drawer open', async ({ page }) => {
    await menuButton(page).click()
    await page
      .getByRole('dialog', { name: 'Menu' })
      .getByRole('button', { name: 'About OGSERC' })
      .click()
    const results = await new AxeBuilder({ page }).withTags(WCAG_21_AA).analyze()
    expect(results.violations).toEqual([])
  })
})
