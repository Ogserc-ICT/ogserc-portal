import { expect, test } from '@playwright/test'

// Search engine indexing (D-078): robots.txt, sitemap.xml, canonical links and link previews.
// Canonical links and the sitemap use SITE_URL, which CI and local runs set to the test address.
const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

const metaContent = (html: string, attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1]

const canonicalOf = (html: string) => html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]

const sitemapUrls = async (request: import('@playwright/test').APIRequestContext) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  return [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

test.describe('Search engines', () => {
  test('robots.txt allows the public site, keeps out staff routes and names the sitemap', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('Allow: /')
    expect(body).toContain('Disallow: /admin')
    expect(body).toContain('Disallow: /api')
    expect(body).toContain(`Sitemap: ${siteUrl}/sitemap.xml`)
  })

  test('the sitemap lists public pages and content, never unfinished ones', async ({ request }) => {
    const urls = await sitemapUrls(request)
    expect(urls).toContain(siteUrl)
    expect(urls).toContain(`${siteUrl}/about`)
    expect(urls).toContain(`${siteUrl}/privacy-policy`)
    expect(urls.some((url) => url.startsWith(`${siteUrl}/media-center/news/`))).toBe(true)
    expect(urls.some((url) => url.startsWith(`${siteUrl}/media-center/notices/`))).toBe(true)
    expect(urls.some((url) => url.includes('/orders-and-directives/'))).toBe(true)
    expect(urls.filter((url) => /being-prepared|design-system/.test(url))).toEqual([])
    expect(new Set(urls).size).toBe(urls.length)
  })

  test('every sitemap page loads, may be indexed and names itself as the official address', async ({
    request,
  }) => {
    test.slow()
    for (const url of await sitemapUrls(request)) {
      const path = url.slice(siteUrl.length) || '/'
      const response = await request.get(path)
      expect(response.status(), path).toBe(200)
      const html = await response.text()
      expect(metaContent(html, 'name', 'robots') ?? '', path).not.toContain('noindex')
      expect(canonicalOf(html), path).toBe(url)
      expect(metaContent(html, 'property', 'og:url'), path).toBe(url)
    }
  })

  test('pages carry a link preview with title, description and image', async ({ request }) => {
    const html = await (await request.get('/about')).text()
    expect(metaContent(html, 'property', 'og:title')).toBeTruthy()
    expect(metaContent(html, 'property', 'og:description')).toBeTruthy()
    expect(metaContent(html, 'property', 'og:site_name')).toContain('OGSERC')
    expect(metaContent(html, 'property', 'og:image')).toMatch(/^https?:\/\/.+opengraph-image/)
    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary_large_image')
  })

  test('a filtered address still names the plain page as official', async ({ request }) => {
    const html = await (await request.get('/media-center/news?page=2')).text()
    expect(canonicalOf(html)).toBe(`${siteUrl}/media-center/news`)
  })

  test('the "being prepared" page stays out of search results', async ({ request }) => {
    const html = await (await request.get('/being-prepared')).text()
    expect(metaContent(html, 'name', 'robots')).toContain('noindex')
  })
})
