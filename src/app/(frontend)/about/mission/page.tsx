import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AboutNav } from '@/components/layout/AboutNav'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { hrefFor, routes } from '@/lib/navigation'
import { visionMissionValues } from '@/lib/placeholder-content'

const page = routes.visionMissionValues

export const metadata: Metadata = {
  title: page.label,
  description:
    'The vision, mission and values (PRIDE) of the Ogun State Electricity Regulatory Commission.',
}

type StatementProps = { id: string; icon: IconName; title: string; children: ReactNode }

function Statement({ id, icon, title, children }: StatementProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-6 rounded-lg border border-line bg-white p-6 sm:p-8"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-green-50 text-green-700">
        <Icon name={icon} className="size-6" />
      </span>
      <h2 id={`${id}-heading`} className="mt-4 text-2xl font-bold text-green-900">
        {title}
      </h2>
      <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded-full bg-gold-400" />
      <p className="mt-4 text-lg leading-relaxed">{children}</p>
    </section>
  )
}

/** SRS Section 4 "Our Mission", as one page with the vision and values (D-061). */
export default function VisionMissionValuesPage() {
  const { vision, mission, values } = visionMissionValues

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
        <Container className="space-y-12">
          <div className="grid gap-6 md:grid-cols-2">
            <Statement id="vision" icon="eye" title="Our vision">
              {vision}
            </Statement>
            <Statement id="mission" icon="bolt" title="Our mission">
              {mission}
            </Statement>
          </div>

          <section id="values" aria-labelledby="values-heading" className="scroll-mt-6">
            <h2 id="values-heading" className="text-2xl font-bold text-green-900 sm:text-3xl">
              Our values: PRIDE
            </h2>
            <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded-full bg-gold-400" />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {values.map((value) => (
                <li key={value.name} className="rounded-lg border border-line bg-white p-6">
                  {/* The initials spell PRIDE down the list; the heading carries the word. */}
                  <span
                    aria-hidden="true"
                    className="flex size-12 items-center justify-center rounded-lg bg-green-900 text-2xl font-bold text-gold-400"
                  >
                    {value.name[0]}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-green-900">{value.name}</h3>
                  <p className="mt-2 text-ink-muted">{value.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      </div>
    </>
  )
}
