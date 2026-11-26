import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LegalPageView } from '@/components/layout/LegalPageView'
import { findPage } from '@/lib/cms/content'
import { termsOfService } from '@/lib/legal/legal-pages'

export async function generateMetadata(): Promise<Metadata> {
  const page = await findPage(termsOfService.slug)
  return { title: page?.title ?? termsOfService.title, description: page?.summary ?? undefined }
}

/** FR-WEB-06 Terms of Service (D-074); its text is in the CMS (D-100). */
export default async function TermsOfServicePage() {
  const page = await findPage(termsOfService.slug)
  if (!page) notFound()
  return <LegalPageView page={page} />
}
