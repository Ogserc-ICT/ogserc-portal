import { Card, ImagePlaceholder } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { byNewestFirst, formatDate } from '@/lib/format-date'
import { hrefFor, routes } from '@/lib/navigation'
import type { NewsItem } from '@/lib/placeholder-content'

/**
 * FR-WEB-02 Latest Updates. A CSS scroll-snap row instead of a JavaScript carousel (D-030): it
 * scrolls by swipe, trackpad, or keyboard (the region is focusable), and nothing moves on its own.
 */
export function LatestUpdates({ items }: { items: NewsItem[] }) {
  return (
    <section
      data-reveal
      aria-labelledby="latest-updates-heading"
      className="bg-green-50 py-12 sm:py-16"
    >
      <Container>
        <SectionHeading
          id="latest-updates-heading"
          title="Latest updates"
          action={{ label: 'View all news', href: hrefFor(routes.news) }}
        />
        <div
          role="region"
          aria-label="Latest updates, scroll sideways for more"
          tabIndex={0}
          className="-mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
        >
          <ul className="flex gap-4 lg:gap-6">
            {byNewestFirst(items).map((item) => (
              <li
                key={item.id}
                className="w-[85%] shrink-0 snap-start sm:w-[45%] lg:w-[calc((100%-3rem)/3)]"
              >
                <Card
                  title={item.title}
                  href={item.href}
                  media={<ImagePlaceholder />}
                  meta={<time dateTime={item.date}>{formatDate(item.date)}</time>}
                >
                  {item.excerpt}
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  )
}
