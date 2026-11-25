import type { Metadata } from 'next'

import { AboutNav } from '@/components/layout/AboutNav'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { hrefFor, routes } from '@/lib/navigation'
import { ourHistory } from '@/lib/about/content'

const page = routes.history

export const metadata: Metadata = {
  title: page.label,
  description:
    'How the Ogun State Electricity Regulatory Commission was established, from the Electricity Act, 2023 to the Ogun State Power Law, 2024.',
}

/** SRS Section 4 "Our History" (D-064): the story, then its key dates. */
export default function HistoryPage() {
  return (
    <>
      <PageBand
        breadcrumbs={[
          { label: 'About OGSERC', href: hrefFor(routes.about) },
          { label: page.label },
        ]}
        eyebrow="About OGSERC"
        titleId="page-title"
        title={page.label}
      />
      <AboutNav currentPath={page.path} />

      <div className="bg-green-50 py-12 sm:py-16">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="max-w-3xl space-y-5 text-lg leading-relaxed">
            {ourHistory.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <section aria-labelledby="key-dates-heading" className="min-w-0">
            <h2 id="key-dates-heading" className="text-2xl font-bold text-green-900">
              Key dates
            </h2>
            <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded-full bg-gold-400" />
            <ol className="mt-6 border-l-2 border-green-700">
              {ourHistory.keyDates.map((item) => (
                <li key={item.date} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[7px] size-3 rounded-full bg-gold-400 ring-2 ring-green-700"
                  />
                  <p className="font-bold text-green-900">{item.date}</p>
                  <p className="mt-1 text-ink-muted">{item.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </Container>
      </div>
    </>
  )
}
