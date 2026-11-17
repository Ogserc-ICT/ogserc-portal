import Link from 'next/link'
import type { ReactNode } from 'react'

import { ConsultationPanel } from '@/components/documents/ConsultationPanel'
import { DocumentText } from '@/components/documents/DocumentText'
import { InstrumentNav } from '@/components/documents/InstrumentNav'
import { PdfPreview } from '@/components/documents/PdfPreview'
import { StatusBadge } from '@/components/documents/StatusBadge'
import { PageBand } from '@/components/layout/PageBand'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { Panel } from '@/components/ui/Panel'
import { documentHref, fileSummary, relatedDocuments } from '@/lib/documents/catalogue'
import type { RegulatoryDocument } from '@/lib/documents/types'
import { formatDate } from '@/lib/format-date'
import { hrefFor, routes } from '@/lib/navigation'

type Category = { label: string; path: string }

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  )
}

function Details({ doc }: { doc: RegulatoryDocument }) {
  return (
    <dl className="space-y-3 text-sm">
      <DetailRow label="Reference">{doc.reference}</DetailRow>
      <DetailRow label="Type">{doc.typeLabel}</DetailRow>
      {/* An Order is "made"; a consultation document is published for comment. */}
      <DetailRow label={doc.consultation ? 'Published' : 'Made'}>
        <time dateTime={doc.publicationDate}>{formatDate(doc.publicationDate)}</time>
      </DetailRow>
      {doc.effectiveDate ? (
        <DetailRow label="Effective">
          <time dateTime={doc.effectiveDate}>{formatDate(doc.effectiveDate)}</time>
        </DetailRow>
      ) : null}
      <DetailRow label="Status">
        <StatusBadge status={doc.status} />
      </DetailRow>
      <DetailRow label="File">{fileSummary(doc)}</DetailRow>
    </dl>
  )
}

function Related({ doc }: { doc: RegulatoryDocument }) {
  const related = relatedDocuments(doc)
  if (related.length === 0) return null
  return (
    <Panel id="related-documents" title="Related documents">
      <ul className="space-y-4 text-sm">
        {related.map((other) => (
          <li key={other.slug}>
            <p className="text-ink-muted">
              {other.typeLabel} · {other.reference}
            </p>
            <Link
              href={documentHref(other)}
              className="font-semibold text-green-700 underline underline-offset-4"
            >
              {other.title}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** A document's own page (FR-DOC-03): status, details, the file, its full text and related documents. */
export function DocumentDetail({ doc, category }: { doc: RegulatoryDocument; category: Category }) {
  return (
    <>
      <PageBand
        breadcrumbs={[
          {
            label: routes.regulatoryInstruments.label,
            href: hrefFor(routes.regulatoryInstruments),
          },
          { label: category.label, href: category.path },
          { label: doc.reference },
        ]}
        eyebrow={doc.consultation ? `${category.label} · ${doc.typeLabel}` : category.label}
        titleId="document-title"
        title={doc.title}
        long
      >
        <p className="mt-4 max-w-3xl text-green-50">{doc.description}</p>
        <p className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-white px-3 py-1 font-semibold">
            {doc.reference}
          </span>
          {doc.effectiveDate ? (
            <span className="inline-flex items-center gap-1.5 text-green-50">
              <Icon name="calendar" className="size-4" />
              Effective {formatDate(doc.effectiveDate)}
            </span>
          ) : null}
          <StatusBadge status={doc.status} />
          {doc.consultation ? (
            <Badge tone="gold">Comments by {formatDate(doc.consultation.closingDate)}</Badge>
          ) : null}
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-8">
            <section
              aria-labelledby="document-file"
              className="overflow-hidden rounded-lg border border-line bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-danger px-2 py-1 text-xs font-bold text-white">
                    PDF
                  </span>
                  <div>
                    <h2 id="document-file" className="font-semibold text-green-900">
                      {doc.file.description}
                    </h2>
                    <p className="text-sm text-ink-muted">{fileSummary(doc)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={doc.file.href} className={buttonClasses('outline')}>
                    <Icon name="external" className="size-4" />
                    Open
                  </a>
                  <a
                    href={doc.file.href}
                    download={doc.file.downloadName}
                    className={buttonClasses('secondary')}
                  >
                    <Icon name="download" className="size-4" />
                    Download
                  </a>
                </div>
              </div>
              <PdfPreview href={doc.file.href} title={doc.title} />
            </section>

            {doc.text ? (
              <section
                aria-labelledby="full-text"
                className="rounded-lg border border-line bg-white p-5 sm:p-8"
              >
                <h2 id="full-text" className="text-2xl font-bold text-green-900">
                  Full text
                </h2>
                <p className="mt-2 mb-6 text-sm text-ink-muted">
                  The text of the {doc.typeLabel.toLowerCase()}, for reading and searching. The
                  signed PDF above is the official copy.
                </p>
                <DocumentText blocks={doc.text} />
              </section>
            ) : null}
          </div>

          <aside aria-label="About this document" className="min-w-0 space-y-6">
            {doc.consultation ? <ConsultationPanel consultation={doc.consultation} /> : null}
            <Panel id="document-details" title="Document details">
              <Details doc={doc} />
              <a
                href={doc.file.href}
                download={doc.file.downloadName}
                className={buttonClasses('secondary', 'mt-6 w-full')}
              >
                <Icon name="download" className="size-4" />
                Download document
              </a>
            </Panel>
            <Related doc={doc} />
            {doc.enquiries ? (
              <Panel id="document-questions" title="Questions?">
                <p className="text-sm text-ink-muted">{doc.enquiries.note}</p>
                <a
                  href={`mailto:${doc.enquiries.email}`}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-green-700 underline underline-offset-4"
                >
                  <Icon name="mail" className="size-4" />
                  {doc.enquiries.email}
                </a>
              </Panel>
            ) : null}
            <div className="rounded-lg border border-line bg-white p-6">
              <InstrumentNav currentPath={category.path} />
            </div>
          </aside>
        </Container>
      </div>
    </>
  )
}
