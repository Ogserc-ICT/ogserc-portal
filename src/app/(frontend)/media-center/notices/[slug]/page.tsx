import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { RichText } from '@/components/content/RichText'
import { PageBand } from '@/components/layout/PageBand'
import { BankAccounts } from '@/components/notices/BankAccounts'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { Panel } from '@/components/ui/Panel'
import { categoryLabel, findNotice } from '@/lib/cms/content'
import { formatDate } from '@/lib/format-date'
import { routes } from '@/lib/navigation'
import { safeHref } from '@/lib/safe-href'
import type { Announcement } from '@/payload-types'

type Props = { params: Promise<{ slug: string }> }

// Published notices with a page of their own only (D-096); any other address is a 404.
async function load(params: Props['params']): Promise<Announcement> {
  const notice = await findNotice((await params).slug)
  if (!notice) notFound()
  return notice
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const notice = await load(params)
  return { title: `${categoryLabel(notice.category)}: ${notice.title}`, description: notice.summary }
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}

const day = (value: string | null | undefined) => (value ? value.slice(0, 10) : undefined)

/**
 * An announcement's own page (FR-NEWS-03, D-065, D-096): the notice as issued, its payment details
 * if any, then who signed it; beside it the notice's details, its links and where questions go.
 */
export default async function NoticePage({ params }: Props) {
  const notice = await load(params)
  const category = categoryLabel(notice.category)
  const issued = day(notice.issuedDate) ?? day(notice.postedDate)!
  const accounts = notice.payment?.accounts ?? []
  const links = (notice.relatedLinks ?? []).flatMap((link) => {
    const href = safeHref(link.link)
    return href ? [{ ...link, href }] : []
  })
  const underRef = notice.issuedUnder?.reference
  const underLabel = notice.issuedUnder?.label
  const underHref = safeHref(notice.issuedUnder?.link)
  const enquiries = notice.enquiries
  const signOff = notice.signOff

  return (
    <>
      <PageBand
        breadcrumbs={[
          { label: 'Media Center' },
          { label: routes.notices.label, href: routes.notices.path },
          { label: notice.title },
        ]}
        eyebrow={category}
        titleId="notice-title"
        title={notice.title}
        long
      >
        <p className="mt-4 max-w-3xl text-green-50">
          Ogun State Electricity Regulatory Commission (OGSERC)
          {underRef ? (
            <>
              .{underLabel ? ` ${underLabel}` : ''}{' '}
              {underHref ? (
                <Link href={underHref} className="font-semibold underline underline-offset-4">
                  {underRef}
                </Link>
              ) : (
                underRef
              )}
            </>
          ) : null}
        </p>
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-green-50">
          <Icon name="calendar" className="size-4" />
          {notice.issuedAt ? `Issued at ${notice.issuedAt}, ` : 'Issued '}
          <time dateTime={issued}>{formatDate(issued)}</time>
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article
            aria-labelledby="notice-title"
            className="min-w-0 space-y-10 rounded-lg border border-line bg-white p-5 text-lg leading-relaxed sm:p-8"
          >
            <RichText data={notice.body} className="space-y-4" />

            {accounts.length > 0 ? (
              <section aria-labelledby="payment" className="space-y-4">
                <h2 id="payment" className="text-xl font-bold text-green-900 sm:text-2xl">
                  Payment details
                </h2>
                {notice.payment?.intro ? <p>{notice.payment.intro}</p> : null}
                <BankAccounts accounts={accounts} />
              </section>
            ) : null}

            {signOff?.closing || signOff?.signatories ? (
              <footer className="space-y-2 border-t border-line pt-6">
                {signOff.closing ? <p>{signOff.closing}</p> : null}
                {signOff.signatories ? <p className="font-semibold text-green-900">{signOff.signatories}</p> : null}
              </footer>
            ) : null}
          </article>

          <aside aria-label="About this notice" className="min-w-0 space-y-6">
            <Panel id="notice-details" title="Notice details">
              <dl className="space-y-3 text-sm">
                <DetailRow label="Type">
                  <Badge>{category}</Badge>
                </DetailRow>
                <DetailRow label="Issued">
                  <time dateTime={issued}>{formatDate(issued)}</time>
                </DetailRow>
                {underRef ? <DetailRow label={(underLabel ?? '').replace(/\s*No\.?$/, '') || 'Under'}>{underRef}</DetailRow> : null}
              </dl>
              {links.map((link, n) => (
                <Link
                  key={link.id ?? link.href}
                  href={link.href}
                  className={buttonClasses(n === 0 ? 'outline' : 'secondary', n === 0 ? 'mt-6 w-full' : 'mt-3 w-full')}
                >
                  <Icon name={n === 0 ? 'document' : 'arrowRight'} className="size-4" />
                  {link.label}
                </Link>
              ))}
            </Panel>
            {enquiries?.note || enquiries?.email ? (
              <Panel id="notice-questions" title="Questions?">
                {enquiries.note ? <p className="text-sm text-ink-muted">{enquiries.note}</p> : null}
                {enquiries.email ? (
                  <a
                    href={`mailto:${enquiries.email}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-green-700 underline underline-offset-4"
                  >
                    <Icon name="mail" className="size-4" />
                    {enquiries.email}
                  </a>
                ) : null}
              </Panel>
            ) : null}
          </aside>
        </Container>
      </div>
    </>
  )
}
