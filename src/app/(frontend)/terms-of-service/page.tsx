import type { Metadata } from 'next'

import { LegalPageView } from '@/components/layout/LegalPageView'
import { termsOfService } from '@/lib/legal/legal-pages'

export const metadata: Metadata = {
  title: termsOfService.title,
  description: termsOfService.description,
}

/** FR-WEB-06 Terms of Service (D-074). */
export default function TermsOfServicePage() {
  return <LegalPageView page={termsOfService} />
}
