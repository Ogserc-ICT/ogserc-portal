import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/site-url'

/** Search engines may read every public page; staff and API routes are left out (D-078). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
