import { RichText } from '@/components/content/RichText'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { outlineOf } from '@/lib/cms/outline'
import type { Page } from '@/payload-types'

/**
 * FR-CON-01/02 Consumer Complaint page (D-101): the title band, an "On this page" list made from the
 * text's section headings (beside the text on wide screens, above it on phones), then the text from
 * the CMS. Information only: complaints are made by email or letter until the Phase 2 portal.
 */
export function ConsumerComplaintView({ page }: { page: Page }) {
  const outline = outlineOf(page.body)
  return (
    <>
      <PageBand breadcrumbs={[{ label: page.title }]} eyebrow="Consumers" titleId="page-title" title={page.title}>
        {page.summary && <p className="mt-4 max-w-3xl text-lg text-green-50">{page.summary}</p>}
      </PageBand>

      <div className="bg-green-50 py-12 sm:py-16">
        <Container className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
          {outline.length > 1 && (
            <nav aria-labelledby="on-this-page" className="mb-10 lg:mb-0">
              <div className="rounded-lg border border-line bg-white p-5 lg:sticky lg:top-6">
                <h2 id="on-this-page" className="text-sm font-semibold tracking-widest text-green-900 uppercase">
                  On this page
                </h2>
                <ul className="mt-3 space-y-1">
                  {outline.map((entry) => (
                    <li key={entry.id}>
                      <a
                        href={`#${entry.id}`}
                        className="block rounded py-1.5 font-semibold text-green-700 underline-offset-4 hover:underline"
                      >
                        {entry.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
          <RichText data={page.body} className="consumer-text max-w-3xl space-y-4 text-lg leading-relaxed" />
        </Container>
      </div>
    </>
  )
}
