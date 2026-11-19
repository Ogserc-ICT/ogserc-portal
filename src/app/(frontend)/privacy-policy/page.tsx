import type { Metadata } from 'next'

import { LegalPageView } from '@/components/layout/LegalPageView'
import { privacyPolicy } from '@/lib/legal/legal-pages'

export const metadata: Metadata = {
  title: privacyPolicy.title,
  description: privacyPolicy.description,
}

/** FR-WEB-06 Privacy Policy, with the cookie information folded in (D-074). */
export default function PrivacyPolicyPage() {
  return <LegalPageView page={privacyPolicy} />
}
