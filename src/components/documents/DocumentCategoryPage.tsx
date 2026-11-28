import type { ReactNode } from 'react'

import { DocumentCard } from '@/components/documents/DocumentCard'
import { InstrumentNav } from '@/components/documents/InstrumentNav'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { documentsInCategory } from '@/lib/documents/store'
import { hrefFor, routes } from '@/lib/navigation'

type Category = { label: string; path: string }

/** A Regulatory Instruments category: its documents as cards, newest first (FR-DOC-03, D-060). */
export async function DocumentCategoryPage({
  category,
  intro,
  children,
}: {
  category: Category
  intro: string
  /** Shown above the list, e.g. how to comment on a consultation. */
  children?: ReactNode
}) {
  const documents = await documentsInCategory(category.path)
  const count = `${documents.length} ${documents.length === 1 ? 'document' : 'documents'}`

  return (
    <>
      <PageBand
        breadcrumbs={[
          {
            label: routes.regulatoryInstruments.label,
            href: hrefFor(routes.regulatoryInstruments),
          },
          { label: category.label },
        ]}
        eyebrow="Regulatory instruments"
        titleId="category-title"
        title={category.label}
      >
        <p className="mt-4 max-w-2xl text-lg text-green-50">{intro}</p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white px-4 py-1.5 text-sm font-semibold">
          <Icon name="document" className="size-4" />
          {count}
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <InstrumentNav currentPath={category.path} />
          <div className="min-w-0 space-y-6">
            {children}
            <section aria-label="Documents">
              {documents.length > 0 ? (
                <ul className="space-y-4">
                  {documents.map((doc) => (
                    <li key={doc.slug}>
                      <DocumentCard doc={doc} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-line bg-white p-6">
                  No documents have been published in this category yet.
                </p>
              )}
            </section>
          </div>
        </Container>
      </div>
    </>
  )
}
