import { PageBand } from '@/components/layout/PageBand'
import { RichText } from '@/components/content/RichText'
import { Container } from '@/components/ui/Container'
import type { Page } from '@/payload-types'

/** FR-WEB-06 legal page: the title band, the last-updated date, then the text from the CMS (D-074, D-100). */
export function LegalPageView({ page }: { page: Page }) {
  return (
    <>
      <PageBand breadcrumbs={[{ label: page.title }]} eyebrow="Legal" titleId="page-title" title={page.title}>
        {page.lastUpdated && <p className="mt-4 text-green-50">{`Last updated: ${page.lastUpdated}`}</p>}
      </PageBand>

      <div className="bg-green-50 py-12 sm:py-16">
        <Container>
          <RichText data={page.body} className="legal-text max-w-3xl space-y-4 text-lg leading-relaxed" />
        </Container>
      </div>
    </>
  )
}
