import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AboutNav } from '@/components/layout/AboutNav'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { hrefFor, routes } from '@/lib/navigation'
import { aboutOgserc } from '@/lib/cms/content'
import type { AboutOgserc } from '@/payload-types'

const page = routes.structure

export async function generateMetadata(): Promise<Metadata> {
  return { title: page.label, description: (await aboutOgserc()).structure.description }
}

type Division = { name: string; units: string[] }

const toDivision = ({ name, units }: { name: string; units?: AboutOgserc['structure']['office']['units'] }): Division => ({
  name,
  units: (units ?? []).map((unit) => unit.name),
})

const anchorFor = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** SRS Section 4 "OGSERC's Structure" (D-064): the text OGSERC supplied, then the organogram. */
export default async function StructurePage() {
  const structure = (await aboutOgserc()).structure
  const officeOfTheChairman = toDivision(structure.office)
  const divisions = (structure.divisions ?? []).map(toDivision)
  // The text lists the Office of the Chairman last; the organogram draws it beside the Chairman.
  const allDivisions = [...divisions, officeOfTheChairman]

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
          <div className="max-w-3xl space-y-5 text-lg leading-relaxed">
            {(structure.introduction ?? []).map((paragraph, n) => (
              <p key={paragraph.id ?? n}>{paragraph.text}</p>
            ))}
            <ul className="list-disc space-y-1 pl-6">
              {allDivisions.map((division) => (
                <li key={division.name}>
                  <a
                    href={`#${anchorFor(division.name)}`}
                    className="text-green-700 underline underline-offset-4"
                  >
                    {division.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <section aria-labelledby="organogram-heading">
            <h2 id="organogram-heading" className="text-2xl font-bold text-green-900 sm:text-3xl">
              Organogram
            </h2>
            <span aria-hidden="true" className="mt-3 block h-1 w-12 rounded-full bg-gold-400" />
            <p className="mt-4 max-w-3xl text-ink-muted">{structure.organogramNote}</p>
            <Organogram office={officeOfTheChairman} divisions={divisions} />
          </section>
        </Container>
      </div>
    </>
  )
}

function Organogram({ office, divisions }: { office: Division; divisions: Division[] }) {
  return (
    <div className="mt-8 flex flex-col items-center">
      <Node className="bg-green-900">The Commission</Node>
      <Connector />

      <div className="grid w-full justify-items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start lg:gap-0">
        <span aria-hidden="true" className="hidden lg:block" />
        <div className="flex flex-col items-center self-stretch">
          <Node className="bg-green-700">Chairman / CEO</Node>
          <span aria-hidden="true" className="hidden min-h-8 w-0.5 flex-1 bg-green-700 lg:block" />
        </div>
        <div className="flex w-full max-w-sm items-start lg:justify-self-start">
          {/* Meets the Chairman / CEO box at its middle (min-h-12, so 24px down). */}
          <span
            aria-hidden="true"
            className="mt-[23px] hidden h-0.5 w-8 shrink-0 bg-green-700 lg:block"
          />
          <DivisionCard division={office} accent />
        </div>
      </div>

      <Connector className="lg:hidden" />
      <div className="relative w-full lg:pt-8">
        {/* The bar joining the four divisions, from the first card's centre to the last's. */}
        <span
          aria-hidden="true"
          className="absolute top-0 right-[calc(12.5%_-_0.375rem)] left-[calc(12.5%_-_0.375rem)] hidden h-0.5 bg-green-700 lg:block"
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {divisions.map((division) => (
            <li key={division.name} className="relative flex">
              <span
                aria-hidden="true"
                className="absolute -top-8 left-1/2 hidden h-8 w-0.5 bg-green-700 lg:block"
              />
              <DivisionCard division={division} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Node({ className, children }: { className: string; children: ReactNode }) {
  return (
    <p
      className={`flex min-h-12 items-center rounded-lg px-6 py-2 text-center font-semibold text-white ${className}`}
    >
      {children}
    </p>
  )
}

function Connector({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block h-8 w-0.5 bg-green-700 ${className}`} />
}

/** One division and its units, drawn like the organogram: units hang off a vertical line. */
function DivisionCard({ division, accent = false }: { division: Division; accent?: boolean }) {
  const id = anchorFor(division.name)
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`w-full scroll-mt-6 rounded-lg border border-line bg-white ${
        accent ? 'border-t-4 border-t-gold-400' : 'border-t-4 border-t-green-700'
      }`}
    >
      <h3 id={`${id}-heading`} className="px-5 pt-4 text-lg font-bold text-green-900">
        {division.name}
      </h3>
      <ul className="mx-5 my-4 space-y-3 border-l-2 border-green-700">
        {division.units.map((unit) => (
          <li key={unit} className="relative pl-5">
            <span aria-hidden="true" className="absolute top-3 left-0 h-0.5 w-3 bg-green-700" />
            {unit}
          </li>
        ))}
      </ul>
    </section>
  )
}
