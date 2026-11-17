import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import type { LegalPage, LegalSection } from '@/lib/legal/legal-pages'
import { contactDetails } from '@/lib/placeholder-content'

/** FR-WEB-06 legal page: the title band, the last-updated date, then numbered sections (D-074). */
export function LegalPageView({ page }: { page: LegalPage }) {
  return (
    <>
      <PageBand
        breadcrumbs={[{ label: page.title }]}
        eyebrow="Legal"
        titleId="page-title"
        title={page.title}
      >
        <p className="mt-4 text-green-50">Last updated: {page.lastUpdated}</p>
      </PageBand>

      <div className="bg-green-50 py-12 sm:py-16">
        <Container>
          <div className="max-w-3xl space-y-10 text-lg leading-relaxed">
            {page.sections.map((section) => (
              <Section key={section.heading} section={section} />
            ))}
          </div>
        </Container>
      </div>
    </>
  )
}

function Section({ section }: { section: LegalSection }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-green-900">{section.heading}</h2>
      <div className="mt-4 space-y-4">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {section.list && (
          <ul className="list-disc space-y-2 pl-6 marker:text-green-700">
            {section.list.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {section.emailLead && (
          <p>
            {section.emailLead}{' '}
            <a
              href={`mailto:${contactDetails.email}`}
              className="font-semibold text-green-700 underline underline-offset-4"
            >
              {contactDetails.email}
            </a>
            .
          </p>
        )}
      </div>
    </section>
  )
}
