import Link from 'next/link'

import { Badge } from '@/components/ui/Badge'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { byNewestFirst, formatDate } from '@/lib/format-date'
import { hrefFor, routes } from '@/lib/navigation'
import type { Notice } from '@/lib/placeholder-content'

/** FR-WEB-04: notices on the homepage, newest first. The full sortable list arrives in step 9. */
export function PublicNotices({ items }: { items: Notice[] }) {
  return (
    <section data-reveal aria-labelledby="public-notices-heading" className="py-12 sm:py-16">
      <Container>
        <SectionHeading
          id="public-notices-heading"
          title="Public notices"
          action={{ label: 'View all notices', href: hrefFor(routes.notices) }}
        />
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {byNewestFirst(items).map((notice) => (
            <li
              key={notice.id}
              className="relative flex flex-col gap-2 p-4 hover:bg-green-50 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
            >
              <time dateTime={notice.date} className="shrink-0 text-sm text-ink-muted sm:w-40">
                {formatDate(notice.date)}
              </time>
              <div className="shrink-0 sm:w-44">
                <Badge>{notice.category}</Badge>
              </div>
              <h3 className="font-semibold text-green-900">
                <Link
                  href={notice.href}
                  className="underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline"
                >
                  {notice.title}
                </Link>
              </h3>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
