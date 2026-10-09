import type { Metadata } from 'next'

import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

const title = 'This section is being prepared'

export const metadata: Metadata = {
  title,
  robots: { index: false },
}

// Shared destination for every menu link whose page is not built yet (D-027).
export default function BeingPreparedPage() {
  return (
    <Container className="py-8 sm:py-12">
      <Breadcrumbs items={[{ label: title }]} />
      <div className="mt-10 max-w-2xl pb-8">
        <h1 className="text-3xl font-bold text-green-900 sm:text-4xl">{title}</h1>
        <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-gold-400" />
        <p className="mt-6 text-lg">
          The Commission is preparing the content for this part of the website. Please check back
          soon.
        </p>
        <ButtonLink href="/" className="mt-8">
          Back to the homepage
        </ButtonLink>
      </div>
    </Container>
  )
}
