import type { MetadataRoute } from 'next'

import { documentHref, documentsInCategory } from '@/lib/documents/catalogue'
import { privacyPolicy, termsOfService } from '@/lib/legal/legal-pages'
import { routes } from '@/lib/navigation'
import { articleHref, newsArticles } from '@/lib/news/news-articles'
import { noticeHref, publicNotices } from '@/lib/notices/public-notices'
import { absoluteUrl } from '@/lib/site-url'

/**
 * Every public page that exists, for search engines (D-078). Built from the same lists as the menu
 * and the pages themselves, so new content appears here without editing this file. Menu entries
 * that are not ready, and the "being prepared" and design-review pages, are left out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = new Set<string>(['/', privacyPolicy.path, termsOfService.path])
  for (const route of Object.values(routes)) {
    if (route.ready) pages.add(route.path)
  }

  const documents = [routes.ordersAndDirectives, routes.consultation].flatMap((category) =>
    documentsInCategory(category.path).map((doc) => ({
      url: absoluteUrl(documentHref(doc)),
      lastModified: doc.publicationDate,
    })),
  )

  return [
    ...[...pages].map((path) => ({ url: absoluteUrl(path) })),
    ...newsArticles.map((article) => ({
      url: absoluteUrl(articleHref(article)),
      lastModified: article.date,
    })),
    ...publicNotices.map((notice) => ({
      url: absoluteUrl(noticeHref(notice)),
      lastModified: notice.issuedDate,
    })),
    ...documents,
  ]
}
