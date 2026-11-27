import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LegalPageView } from '@/components/layout/LegalPageView'
import { findPage } from '@/lib/cms/content'
import { privacyPolicy } from '@/lib/legal/legal-pages'

export async function generateMetadata(): Promise<Metadata> {
  const page = await findPage(privacyPolicy.slug)
  return { title: page?.title ?? privacyPolicy.title, description: page?.summary ?? undefined }
}

/** FR-WEB-06 Privacy Policy, with the cookie information folded in (D-074); its text is in the CMS (D-100). */
export default async function PrivacyPolicyPage() {
  const page = await findPage(privacyPolicy.slug)
  if (!page) notFound()
  return <LegalPageView page={page} />
}
