import type { Metadata } from 'next'
import Link from 'next/link'

import { PageBand } from '@/components/layout/PageBand'
import { Badge } from '@/components/ui/Badge'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { byNewestFirst, formatDate } from '@/lib/format-date'
import { routes } from '@/lib/navigation'
import { noticeHref, publicNotices } from '@/lib/notices/public-notices'

const page = routes.notices

export const metadata: Metadata = {
  title: page.label,
  description: 'Public notices issued by the Ogun State Electricity Regulatory Commission.',
}

/** Media Center > Public Notices (D-065), newest first. Filters arrive with step 9. */
export default function NoticesPage() {
  const items = byNewestFirst(
    publicNotices.map((notice) => ({ ...notice, date: notice.postedDate })),
  )

  return (
    <>
      <PageBand
        breadcrumbs={[{ label: 'Media Center' }, { label: page.label }]}
        eyebrow="Media Center"
        titleId="page-title"
        title={page.label}
      >
        <p className="mt-4 max-w-2xl text-lg text-green-50">
          Notices issued by OGSERC to operators, consumers and the public.
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container>
          <ul className="space-y-4">
            {items.map((notice) => (
              <li
                key={notice.slug}
                className="relative rounded-lg border border-line bg-white p-5 hover:border-green-700 sm:p-6"
              >
                <p className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                  <Badge>{notice.category}</Badge>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="calendar" className="size-4" />
                    Issued <time dateTime={notice.issuedDate}>{formatDate(notice.issuedDate)}</time>
                  </span>
                </p>
                <h2 className="mt-3 text-xl font-bold text-green-900">
                  <Link
                    href={noticeHref(notice)}
                    className="underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline"
                  >
                    {notice.title}
                  </Link>
                </h2>
                <p className="mt-2 text-ink-muted">{notice.summary}</p>
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </>
  )
}
