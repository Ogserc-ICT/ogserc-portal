import type { Metadata } from 'next'

import { AboutNav } from '@/components/layout/AboutNav'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { routes } from '@/lib/navigation'
import { aboutUs } from '@/lib/placeholder-content'

const page = routes.about

export const metadata: Metadata = {
  title: page.label,
  description:
    'Who the Ogun State Electricity Regulatory Commission is, and what it does for consumers and investors in Ogun State.',
}

/** SRS Section 4 "About Us" (D-064). */
export default function AboutUsPage() {
  return (
    <>
      <PageBand
        breadcrumbs={[{ label: page.label }]}
        eyebrow="About OGSERC"
        titleId="page-title"
        title={page.label}
      />
      <AboutNav currentPath={page.path} />

      <div className="bg-green-50 py-12 sm:py-16">
        <Container className="space-y-12">
          <div className="max-w-3xl space-y-5 text-lg leading-relaxed">
            {aboutUs.introduction.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <section id="what-we-do" aria-labelledby="what-we-do-heading" className="scroll-mt-6">
            <h2 id="what-we-do-heading" className="text-2xl font-bold text-green-900 sm:text-3xl">
              What we do
            </h2>
            <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded-full bg-gold-400" />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aboutUs.whatWeDo.map((item) => (
                <li key={item.title} className="rounded-lg border border-line bg-white p-6">
                  <span className="flex size-12 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <Icon name={item.icon} className="size-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-green-900">{item.title}</h3>
                  <p className="mt-2 text-ink-muted">{item.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      </div>
    </>
  )
}
