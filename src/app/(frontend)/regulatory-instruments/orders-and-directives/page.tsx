import type { Metadata } from 'next'

import { DocumentCategoryPage } from '@/components/documents/DocumentCategoryPage'
import { routes } from '@/lib/navigation'

const category = routes.ordersAndDirectives

export const metadata: Metadata = {
  title: category.label,
  description: 'Orders and directives issued by the Ogun State Electricity Regulatory Commission.',
}

/** SRS 6.2 documents (FR-DOC-03, FR-DOC-05) for Orders & Directives; layout from D-060. */
export default function OrdersAndDirectivesPage() {
  return (
    <DocumentCategoryPage
      category={category}
      intro="Orders and directives issued by the Commission."
    />
  )
}
