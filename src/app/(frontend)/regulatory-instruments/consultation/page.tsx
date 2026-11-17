import type { Metadata } from 'next'

import { DocumentCategoryPage } from '@/components/documents/DocumentCategoryPage'
import { routes } from '@/lib/navigation'

const category = routes.consultation

export const metadata: Metadata = {
  title: category.label,
  description:
    'Consultation papers and draft instruments published by the Ogun State Electricity Regulatory Commission for comment.',
}

/** SRS 6.3 (FR-DRAFT-01, FR-DRAFT-02): papers and drafts published for comment (D-071). */
export default function ConsultationPage() {
  return (
    <DocumentCategoryPage
      category={category}
      intro="Consultation papers and draft instruments the Commission has published for comment."
    >
      <p className="rounded-lg border border-line bg-white p-5 text-sm sm:p-6">
        Each document&rsquo;s page gives the closing date for comments and where to send them.
        Comments are made in writing, by email or by hand; they cannot yet be submitted on this
        website.
      </p>
    </DocumentCategoryPage>
  )
}
