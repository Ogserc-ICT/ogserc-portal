import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PageBand } from '@/components/layout/PageBand'
import { BankAccounts } from '@/components/notices/BankAccounts'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { Panel } from '@/components/ui/Panel'
import { documentHref, findDocument } from '@/lib/documents/catalogue'
import type { RegulatoryDocument } from '@/lib/documents/types'
import { formatDate } from '@/lib/format-date'
import { routes } from '@/lib/navigation'
import {
  type NoticeSection,
  type PublicNotice,
  findNotice,
  publicNotices,
} from '@/lib/notices/public-notices'

type Props = { params: Promise<{ slug: string }> }

// Only the notices in the list exist; any other address is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return publicNotices.map((notice) => ({ slug: notice.slug }))
}

async function load(params: Props['params']): Promise<PublicNotice> {
  const notice = findNotice((await params).slug)
  if (!notice) notFound()
  return notice
}

function orderFor(notice: PublicNotice): RegulatoryDocument {
  const order = findDocument(routes.ordersAndDirectives.path, notice.orderSlug)
  if (!order) throw new Error(`Missing document ${notice.orderSlug}`)
  return order
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const notice = await load(params)
  return { title: `Public notice: ${notice.title}`, description: notice.summary }
}

const linkClasses = 'font-semibold text-green-700 underline underline-offset-4'

function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="text-xl font-bold text-green-900 sm:text-2xl">
        {heading}
      </h2>
      {children}
    </section>
  )
}

function NoticeSectionBody({ section }: { section: NoticeSection }) {
  return (
    <>
      {section.intro ? <p>{section.intro}</p> : null}
      {section.items ? (
        <ul className="list-disc space-y-2 pl-6 marker:text-green-700">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.outro ? <p>{section.outro}</p> : null}
    </>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}

/** A public notice's own page (FR-NEWS-03, D-065): the notice as issued, then who signed it. */
export default async function NoticePage({ params }: Props) {
  const notice = await load(params)
  const order = orderFor(notice)
  const { howToRegister, payment } = notice

  return (
    <>
      <PageBand
        breadcrumbs={[
          { label: 'Media Center' },
          { label: routes.notices.label, href: routes.notices.path },
          { label: notice.title },
        ]}
        eyebrow={notice.category}
        titleId="notice-title"
        title={notice.title}
        long
      >
        <p className="mt-4 max-w-3xl text-green-50">
          Ogun State Electricity Regulatory Commission (OGSERC). Order No.{' '}
          <Link href={documentHref(order)} className="font-semibold underline underline-offset-4">
            {order.reference}
          </Link>
        </p>
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-green-50">
          <Icon name="calendar" className="size-4" />
          Issued at {notice.issuedAt},{' '}
          <time dateTime={notice.issuedDate}>{formatDate(notice.issuedDate)}</time>
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article
            aria-labelledby="notice-title"
            className="min-w-0 space-y-10 rounded-lg border border-line bg-white p-5 text-lg leading-relaxed sm:p-8"
          >
            {notice.sections.map((section, i) => (
              <Section key={section.heading} id={`section-${i + 1}`} heading={section.heading}>
                <NoticeSectionBody section={section} />
              </Section>
            ))}

            <Section id="how-to-register" heading="How to register">
              <p>{howToRegister.intro}</p>
              <ul className="list-disc space-y-2 pl-6 marker:text-green-700">
                <li>By hand: {howToRegister.byHand}</li>
                <li>
                  By email:{' '}
                  <a href={`mailto:${howToRegister.email}`} className={linkClasses}>
                    {howToRegister.email}
                  </a>
                </li>
              </ul>
              <p>
                <Link href={routes.forms.path} className={linkClasses}>
                  Find and download your registration form
                </Link>
              </p>
              <p className="text-ink-muted">
                Issued at {notice.issuedAt}, {formatDate(notice.issuedDate)}.
              </p>
              <p>
                {notice.enquiries}{' '}
                <a href={`mailto:${howToRegister.email}`} className={linkClasses}>
                  {howToRegister.email}
                </a>
              </p>
            </Section>

            <Section id="payment" heading="Payment details">
              <p>{payment.intro}</p>
              <BankAccounts accounts={payment.accounts} />
            </Section>

            <footer className="space-y-2 border-t border-line pt-6">
              <p>{notice.closing}</p>
              <p className="font-semibold text-green-900">{notice.signatories}</p>
            </footer>
          </article>

          <aside aria-label="About this notice" className="min-w-0 space-y-6">
            <Panel id="notice-details" title="Notice details">
              <dl className="space-y-3 text-sm">
                <DetailRow label="Type">
                  <Badge>{notice.category}</Badge>
                </DetailRow>
                <DetailRow label="Issued">
                  <time dateTime={notice.issuedDate}>{formatDate(notice.issuedDate)}</time>
                </DetailRow>
                <DetailRow label="Order">{order.reference}</DetailRow>
              </dl>
              <Link href={documentHref(order)} className={buttonClasses('outline', 'mt-6 w-full')}>
                <Icon name="document" className="size-4" />
                Read the Order
              </Link>
              <Link href={routes.forms.path} className={buttonClasses('secondary', 'mt-3 w-full')}>
                <Icon name="download" className="size-4" />
                Registration forms
              </Link>
            </Panel>
            <Panel id="notice-questions" title="Questions?">
              <p className="text-sm text-ink-muted">{notice.enquiries}</p>
              <a
                href={`mailto:${howToRegister.email}`}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-green-700 underline underline-offset-4"
              >
                <Icon name="mail" className="size-4" />
                {howToRegister.email}
              </a>
            </Panel>
          </aside>
        </Container>
      </div>
    </>
  )
}
