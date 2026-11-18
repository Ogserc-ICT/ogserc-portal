/**
 * The site's public address, from SITE_URL (never hard-coded; CLAUDE.md, Portability). Static pages,
 * robots.txt and sitemap.xml are built in advance, so the Docker build receives it as a build
 * argument (D-078).
 */
export function siteUrl(): URL {
  const value = process.env.SITE_URL?.trim()
  if (value) return new URL(value)
  // A production build without it would tell search engines the site lives on localhost.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SITE_URL must be set when building or running for production')
  }
  return new URL('http://localhost:3000')
}

/** An absolute address on this site. The homepage has no trailing slash, as in its canonical link. */
export function absoluteUrl(path: string): string {
  const url = new URL(path, siteUrl())
  return url.pathname === '/' && !url.search ? url.origin : url.href
}
