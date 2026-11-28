import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocumentDetail } from '@/components/documents/DocumentDetail'
import { findDocument } from '@/lib/documents/store'
import type { RegulatoryDocument } from '@/lib/documents/types'
import { routes } from '@/lib/navigation'

const category = routes.ordersAndDirectives

type Props = { params: Promise<{ slug: string }> }

async function load(params: Props['params']): Promise<RegulatoryDocument> {
  // Published documents only (D-102); any other address, a draft's included, is a 404.
  const doc = await findDocument(category.path, (await params).slug)
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
