import Link from 'next/link'

import { StatusBadge } from '@/components/documents/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { documentHref, fileSummary } from '@/lib/documents/store'
import type { RegulatoryDocument } from '@/lib/documents/types'
import { formatDate } from '@/lib/format-date'

/** One document in a category list (FR-DOC-03): reference, date, status, title, summary, file. */
export function DocumentCard({ doc }: { doc: RegulatoryDocument }) {
  const href = documentHref(doc)
  return (
    <article className="flex gap-4 rounded-lg border border-line bg-white p-5 sm:p-6">
      <span className="hidden size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-green-50 text-green-700 sm:flex">
        <Icon name="document" className="size-5" />
        <span className="text-[0.625rem] font-bold">{doc.file.kind}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="w-full font-semibold tracking-wide text-green-700 uppercase sm:w-auto">
            {doc.reference}
          </span>
          <span aria-hidden="true" className="hidden text-ink-muted sm:inline">
            ·
          </span>
          <time dateTime={doc.publicationDate} className="text-ink-muted">
            {formatDate(doc.publicationDate)}
          </time>
          <StatusBadge status={doc.status} />
          {doc.consultation ? (
            <Badge tone="gold">Comments by {formatDate(doc.consultation.closingDate)}</Badge>
          ) : null}
        </p>
        {doc.consultation ? (
          <p className="mt-2 text-sm font-semibold text-ink-muted">{doc.typeLabel}</p>
        ) : null}
        <h2 className="mt-2 text-lg leading-snug font-bold text-green-900">
          <Link href={href} className="underline-offset-4 hover:underline">
            {doc.title}
          </Link>
        </h2>
        <p className="mt-2 text-ink-muted">{doc.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-green-700 hover:bg-green-50"
          >
            <Icon name="document" className="size-4" />
            View<span className="sr-only"> {doc.reference}</span>
          </Link>
          <a
            href={doc.file.href}
            download={doc.file.downloadName}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-green-50 px-3 font-semibold text-green-900 hover:bg-green-100"
          >
            <Icon name="download" className="size-4" />
            Download<span className="sr-only"> {doc.reference}</span>
          </a>
          <span className="text-sm text-ink-muted">{fileSummary(doc)}</span>
        </div>
      </div>
    </article>
  )
}
