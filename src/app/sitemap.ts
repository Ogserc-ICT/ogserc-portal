import type { MetadataRoute } from 'next'

import { documentHref, documentsInCategory } from '@/lib/documents/catalogue'
import { privacyPolicy, termsOfService } from '@/lib/legal/legal-pages'
import { routes } from '@/lib/navigation'
import { findPage, pagedItems } from '@/lib/cms/content'
import { CONSUMER_COMPLAINT_SLUG } from '@/lib/consumer/consumer-complaint'
import { absoluteUrl } from '@/lib/site-url'

/**
 * Every public page that exists, for search engines (D-078). Built from the same lists as the menu
 * and the pages themselves, so new content appears here without editing this file. Menu entries
 * that are not ready, the Consumer Complaint page until it is published, and the "being prepared"
 * and design-review pages, are left out. Stories and notices come from the CMS, published ones
 * with a page of their own only (D-049, D-096), so the sitemap is made when it is asked for.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { news, notices } = await pagedItems()
  const pages = new Set<string>(['/', privacyPolicy.path, termsOfService.path])
  for (const route of Object.values(routes)) {
    if (route.ready) pages.add(route.path)
  }
  // Ready in the menu, but only a real page once its CMS text is published (D-101).
  if (!(await findPage(CONSUMER_COMPLAINT_SLUG))) pages.delete(routes.consumerComplaint.path)

  const documents = [routes.ordersAndDirectives, routes.consultation].flatMap((category) =>
    documentsInCategory(category.path).map((doc) => ({
      url: absoluteUrl(documentHref(doc)),
      lastModified: doc.publicationDate,
    })),
  )

  return [
    ...[...pages].map((path) => ({ url: absoluteUrl(path) })),
    ...[...news, ...notices].map((item) => ({ url: absoluteUrl(item.path), lastModified: item.updatedAt })),
    ...documents,
  ]
}
