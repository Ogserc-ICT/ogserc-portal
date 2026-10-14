// Saves design-review screenshots to docs/design-review/ at 360, 768 and 1280px wide.
// Pages are captured with reduced motion, so there is no splash, no autoplay and no scroll-reveal
// mid-fade: every screenshot shows the settled design.
// Usage: start the site (pnpm dev or pnpm start), then run:
//   node scripts/design-review-screenshots.mjs [baseURL]
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const baseURL = process.argv[2] ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const outDir = 'docs/design-review'
const widths = [360, 768, 1280]

const shots = [
  { name: 'home', path: '/' },
  { name: 'design-system', path: '/design-system' },
  { name: 'being-prepared', path: '/being-prepared' },
]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, reducedMotion: 'reduce' })

  for (const shot of shots) {
    await page.goto(new URL(shot.path, baseURL).href, { waitUntil: 'networkidle' })
    await page.screenshot({ path: `${outDir}/${shot.name}-${width}.png`, fullPage: true })
  }

  // Menus open, viewport only: below 1024px the drawer with a section expanded; above, a
  // dropdown opened by hovering (D-035, D-036).
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  if (width < 1024) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Menu' })
    await drawer.getByRole('button', { name: 'Regulatory Instruments' }).click()
  } else {
    const nav = page.getByRole('navigation', { name: 'Main' })
    await nav.getByRole('button', { name: 'Regulatory Instruments' }).hover()
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outDir}/menu-open-${width}.png` })

  // Hero carousel and footer on their own, at each width.
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page
    .getByRole('region', { name: 'Highlights' })
    .screenshot({ path: `${outDir}/hero-${width}.png` })
  await page.locator('footer').screenshot({ path: `${outDir}/footer-${width}.png` })

  await page.close()
}

// Header at 1024px, the narrowest desktop width: with Public Sans, and with the web font blocked
// and a wide fallback forced (the worst case on Linux and Android, D-032), where labels wrap.
const header = { x: 0, y: 0, width: 1024, height: 200 }
const narrow = await browser.newPage({
  viewport: { width: 1024, height: 800 },
  reducedMotion: 'reduce',
})
await narrow.goto(baseURL, { waitUntil: 'networkidle' })
await narrow.screenshot({ path: `${outDir}/header-1024.png`, clip: header })
await narrow.route(/\.woff2?$/, (route) => route.abort())
await narrow.goto(baseURL, { waitUntil: 'networkidle' })
await narrow.addStyleTag({
  content: `nav[aria-label="Main"] * { font-family: Verdana, 'DejaVu Sans', sans-serif !important; letter-spacing: 0.04em !important; }`,
})
await narrow.screenshot({ path: `${outDir}/header-1024-wide-fallback.png`, clip: header })
await narrow.close()

await browser.close()
console.log(`Saved screenshots to ${outDir}/`)
