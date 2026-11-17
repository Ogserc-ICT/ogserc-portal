import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocumentDetail } from '@/components/documents/DocumentDetail'
import { documentsInCategory, findDocument } from '@/lib/documents/catalogue'
import type { RegulatoryDocument } from '@/lib/documents/types'
import { routes } from '@/lib/navigation'

const category = routes.ordersAndDirectives

type Props = { params: Promise<{ slug: string }> }

// Only the documents in the catalogue exist; any other address is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return documentsInCategory(category.path).map((doc) => ({ slug: doc.slug }))
}

async function load(params: Props['params']): Promise<RegulatoryDocument> {
  const doc = findDocument(category.path, (await params).slug)
  if (!doc) notFound()
  return doc
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await load(params)
  return { title: `${doc.reference}: ${doc.title}`, description: doc.description }
}

export default async function OrderPage({ params }: Props) {
  return <DocumentDetail doc={await load(params)} category={category} />
}
