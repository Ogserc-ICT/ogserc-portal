import type { Metadata } from 'next'

import { DocumentCard } from '@/components/documents/DocumentCard'
import { InstrumentNav } from '@/components/documents/InstrumentNav'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { documentsInCategory } from '@/lib/documents/catalogue'
import { hrefFor, routes } from '@/lib/navigation'

const category = routes.ordersAndDirectives

export const metadata: Metadata = {
  title: category.label,
  description: 'Orders and directives issued by the Ogun State Electricity Regulatory Commission.',
}

/** SRS 6.2 documents (FR-DOC-03, FR-DOC-05) for Orders & Directives; layout from D-060. */
export default function OrdersAndDirectivesPage() {
  const documents = documentsInCategory(category.path)
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
        <p className="mt-4 max-w-2xl text-lg text-green-50">
          Orders and directives issued by the Commission.
        </p>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white px-4 py-1.5 text-sm font-semibold">
          <Icon name="document" className="size-4" />
          {count}
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <InstrumentNav currentPath={category.path} />
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
        </Container>
      </div>
    </>
  )
}
