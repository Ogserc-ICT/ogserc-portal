import type { ReactNode } from 'react'

import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Container } from '@/components/ui/Container'

type PageBandProps = {
  breadcrumbs: { label: string; href?: string }[]
  /** Small gold label above the title, e.g. "Get in touch". */
  eyebrow: string
  title: ReactNode
  /** Id for the h1, so the band's section can be labelled by it. */
  titleId: string
  /** Smaller title for long document names. */
  long?: boolean
  children?: ReactNode
}

/** Dark green header band for inner pages: breadcrumbs, eyebrow, the page's h1 and an intro. */
export function PageBand({ breadcrumbs, eyebrow, title, titleId, long, children }: PageBandProps) {
  return (
    <section aria-labelledby={titleId} className="on-dark bg-green-900 text-white">
      <Container className="py-8 sm:py-12 lg:pb-16">
        <Breadcrumbs items={breadcrumbs} onDark />
        <p className="mt-10 flex items-center gap-3 text-sm font-semibold tracking-widest text-gold-400 uppercase">
          <span aria-hidden="true" className="h-px w-8 bg-gold-400" />
          {eyebrow}
        </p>
        <h1
          id={titleId}
          className={`mt-3 max-w-4xl font-bold text-balance ${
            long ? 'text-2xl leading-tight sm:text-4xl' : 'text-4xl sm:text-5xl'
          }`}
        >
          {title}
        </h1>
        {children}
      </Container>
    </section>
  )
}
