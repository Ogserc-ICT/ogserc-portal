import type { Metadata } from 'next'
import Link from 'next/link'

import { StatusBadge } from '@/components/documents/StatusBadge'
import { PageBand } from '@/components/layout/PageBand'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { type DownloadGroup, type DownloadItem, downloadGroups } from '@/lib/downloads'
import { formatDate } from '@/lib/format-date'
import { routes } from '@/lib/navigation'

const page = routes.downloads

export const metadata: Metadata = {
  title: page.label,
  description:
    'Every document and form published by the Ogun State Electricity Regulatory Commission, by type, to download.',
}

const countLabel = (n: number) => `${n} ${n === 1 ? 'file' : 'files'}`

/** Resources > Downloads (D-067): every file on the site, grouped by document type. */
export default function DownloadsPage() {
  const groups = downloadGroups()

  return (
    <>
      <PageBand
        breadcrumbs={[{ label: 'Resources' }, { label: page.label }]}
        eyebrow="Resources"
        titleId="page-title"
        title={page.label}
      >
        <p className="mt-4 max-w-2xl text-lg text-green-50">
          Every document and form on this site, by type. Each entry also links to its own page.
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="space-y-10">
          <nav aria-labelledby="download-types" className="min-w-0">
            <h2
              id="download-types"
              className="text-xs font-semibold tracking-widest text-ink-muted uppercase"
            >
              Document types
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {groups.map((group) => (
                <li key={group.id}>
                  <a
                    href={`#${group.id}`}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-white px-4 py-2 text-sm hover:bg-green-50"
                  >
                    {group.label}
                    <span aria-hidden="true" className="text-ink-muted">
                      {group.items.length}
                    </span>
                    <span className="sr-only">{` (${countLabel(group.items.length)})`}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {groups.map((group) => (
            <Group key={group.id} group={group} />
          ))}
        </Container>
      </div>
    </>
  )
}

function Group({ group }: { group: DownloadGroup }) {
  return (
    <section id={group.id} aria-labelledby={`${group.id}-heading`} className="scroll-mt-6">
      <h2 id={`${group.id}-heading`} className="text-2xl font-bold text-green-900">
        {group.label}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{countLabel(group.items.length)}</p>
      <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-white">
        {group.items.map((item) => (
          <li key={item.id}>
            <Entry item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Entry({ item }: { item: DownloadItem }) {
  const isPdf = item.fileSummary.startsWith('PDF')
  return (
    <article
      aria-labelledby={`dl-${item.id}`}
      className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className={`h-fit shrink-0 rounded px-2 py-1 text-xs font-bold text-white ${
            isPdf ? 'bg-danger' : 'bg-green-700'
          }`}
        >
          {isPdf ? 'PDF' : 'DOC'}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-muted">{item.reference}</p>
          <h3 id={`dl-${item.id}`} className="font-semibold text-green-900">
            <Link href={item.pageHref} className="underline-offset-4 hover:underline">
              {item.title}
            </Link>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span>{item.fileSummary}</span>
            {item.date ? <time dateTime={item.date}>{formatDate(item.date)}</time> : null}
            {item.version ? <span>Version {item.version}</span> : null}
            {item.status ? <StatusBadge status={item.status} /> : null}
          </p>
        </div>
      </div>
      <a
        href={item.href}
        download={item.downloadName}
        aria-label={item.downloadLabel}
        className={buttonClasses('secondary', 'shrink-0 self-start md:self-center')}
      >
        <Icon name="download" className="size-4" />
        Download
      </a>
    </article>
  )
}
