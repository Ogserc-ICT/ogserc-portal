import type { Metadata } from 'next'

import { PageBand } from '@/components/layout/PageBand'
import { Card, CardMedia } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { byNewestFirst, formatDate } from '@/lib/format-date'
import { routes } from '@/lib/navigation'
import { listNews } from '@/lib/cms/content'

const page = routes.news

export const metadata: Metadata = {
  title: page.label,
  description: 'News and updates from the Ogun State Electricity Regulatory Commission.',
}

/**
 * Media Center > News (D-068, D-096): every published item in the News collection (FR-NEWS-01),
 * newest first. Build step 9 adds filters and pages of results.
 */
export default async function NewsPage() {
  const latestUpdates = await listNews()
  return (
    <>
      <PageBand
        breadcrumbs={[{ label: 'Media Center' }, { label: page.label }]}
        eyebrow="Media Center"
        titleId="page-title"
        title={page.label}
      >
        <p className="mt-4 max-w-2xl text-lg text-green-50">
          The latest from OGSERC, newest first.
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {byNewestFirst(latestUpdates).map((item) => (
              <li key={item.id}>
                <Card
                  title={item.title}
                  href={item.href}
                  headingLevel="h2"
                  media={<CardMedia image={item.image} />}
                  meta={<time dateTime={item.date}>{formatDate(item.date)}</time>}
                >
                  {item.excerpt}
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </>
  )
}
