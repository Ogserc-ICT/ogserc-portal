// Saves design-review screenshots to docs/design-review/ at 360, 768 and 1280px wide.
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
  const page = await browser.newPage({ viewport: { width, height: 800 } })

  for (const shot of shots) {
    await page.goto(new URL(shot.path, baseURL).href, { waitUntil: 'networkidle' })
    await page.screenshot({ path: `${outDir}/${shot.name}-${width}.png`, fullPage: true })
  }

  // Menus open, viewport only: the mobile menu below 1024px, a desktop dropdown above.
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  const nav = page.getByRole('navigation', { name: 'Main' })
  if (width < 1024) await nav.getByRole('button', { name: 'Menu' }).click()
  await nav.getByRole('button', { name: 'Regulatory Instruments' }).click()
  await page.waitForTimeout(300) // let the chevron animation finish
  await page.screenshot({ path: `${outDir}/menu-open-${width}.png` })

  await page.close()
}

await browser.close()
console.log(`Saved screenshots to ${outDir}/`)
