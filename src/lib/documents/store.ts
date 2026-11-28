import { cache } from 'react'

import { cms } from '@/lib/cms/content'
import { documentFilePath } from '@/lib/media-path'
import type { Document as CmsDocument, DocumentFile as CmsFile } from '@/payload-types'

import { documentBlocks } from './rich-text'
import type { Consultation, DocumentStatus, RegulatoryDocument } from './types'

// Regulatory documents from the Documents collection (D-091, D-102), as the pages show them. Every
// query runs as a visitor (`overrideAccess: false`, no user), so only published documents come
// back, and related documents that are not published are left out (D-049). Never pass a request's
// values into a query here except a page's own address, which is only compared. React's `cache`
// shares a result within one request; nothing is kept between requests (D-051).

export const CATEGORY_BASE = '/regulatory-instruments'
const PUBLIC = { overrideAccess: false } as const
/** Enough for related documents and, in a consultation, their files. */
const DEPTH = 2
const LIMIT = 500

const isoDay = (value: string | null | undefined) => (value ?? '').slice(0, 10)
export const categoryPathOf = (category: string) => `${CATEGORY_BASE}/${category}`
const categoryOfPath = (path: string) => path.slice(CATEGORY_BASE.length + 1)

const FILE_KINDS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
}

const asFile = (value: unknown): CmsFile | undefined =>
  value && typeof value === 'object' && 'filename' in value ? (value as CmsFile) : undefined
const asDocument = (value: unknown): CmsDocument | undefined =>
  value && typeof value === 'object' && 'slug' in value ? (value as CmsDocument) : undefined

function consultationOf(doc: CmsDocument): Consultation | undefined {
  const c = doc.consultation
  if (doc.category !== 'consultation' || !c?.closingDate) return undefined
  return {
    closingDate: isoDay(c.closingDate),
    ...(c.hearingDate ? { hearing: { date: isoDay(c.hearingDate), place: c.hearingPlace ?? '' } } : {}),
    email: c.commentEmail ?? '',
    address: c.commentAddress ?? '',
    ...(c.subjectLine ? { subjectLine: c.subjectLine } : {}),
  }
}

/** A CMS document as the pages show it, or undefined if its file is not available. */
function toDocument(doc: CmsDocument, withRelated = true): RegulatoryDocument | undefined {
  const file = asFile(doc.file)
  const href = documentFilePath(file?.url)
  if (!file || !href) return undefined
  const consultation = consultationOf(doc)
  const related = withRelated
    ? (doc.related ?? []).flatMap((value) => {
        const other = asDocument(value)
        const mapped = other && other.id !== doc.id ? toDocument(other, false) : undefined
        return mapped ? [mapped] : []
      })
    : []
  const text = documentBlocks(doc.body)
  return {
    slug: doc.slug ?? '',
    title: doc.title,
    categoryPath: categoryPathOf(doc.category),
    typeLabel: doc.typeLabel ?? '',
    reference: doc.reference ?? '',
    publicationDate: isoDay(doc.publicationDate),
    ...(doc.effectiveDate ? { effectiveDate: isoDay(doc.effectiveDate) } : {}),
    description: doc.description,
    status: doc.documentStatus as DocumentStatus,
    file: {
      href,
      kind: FILE_KINDS[file.mimeType ?? ''] ?? 'File',
      downloadName: file.filename ?? '',
      sizeBytes: file.filesize ?? 0,
      ...(doc.filePages ? { pages: doc.filePages } : {}),
      description: doc.fileDescription ?? '',
    },
    ...(text ? { text } : {}),
    ...(doc.enquiries?.email ? { enquiries: { email: doc.enquiries.email, note: doc.enquiries.note ?? '' } } : {}),
    ...(consultation ? { consultation } : {}),
    related,
    tags: doc.tags ?? [],
  }
}

const mapAll = (docs: CmsDocument[]) => docs.flatMap((doc) => toDocument(doc) ?? [])

/** Every published document, newest first. */
export const allDocuments = cache(async (): Promise<RegulatoryDocument[]> => {
  const { docs } = await (await cms()).find({ collection: 'documents', ...PUBLIC, sort: ['-publicationDate', '-createdAt'], limit: LIMIT, depth: DEPTH })
  return mapAll(docs)
})

/** The published documents of one category (its page address), newest first. */
export const documentsInCategory = cache(async (categoryPath: string): Promise<RegulatoryDocument[]> => {
  const { docs } = await (await cms()).find({
    collection: 'documents',
    ...PUBLIC,
    where: { category: { equals: categoryOfPath(categoryPath) } },
    sort: ['-publicationDate', '-createdAt'],
    limit: LIMIT,
    depth: DEPTH,
  })
  return mapAll(docs)
})

/** A published document by its category's address and its own, or undefined. */
export const findDocument = cache(async (categoryPath: string, slug: string): Promise<RegulatoryDocument | undefined> => {
  const { docs } = await (await cms()).find({
    collection: 'documents',
    ...PUBLIC,
    where: { and: [{ category: { equals: categoryOfPath(categoryPath) } }, { slug: { equals: slug } }] },
    limit: 1,
    depth: DEPTH,
  })
  return docs[0] ? toDocument(docs[0]) : undefined
})

/** How many published documents each category has, by its page address. */
export const categoryCounts = cache(async (): Promise<Map<string, number>> => {
  const { docs } = await (await cms()).find({ collection: 'documents', ...PUBLIC, limit: LIMIT, depth: 0, select: { category: true } })
  const counts = new Map<string, number>()
  for (const doc of docs) counts.set(categoryPathOf(doc.category), (counts.get(categoryPathOf(doc.category)) ?? 0) + 1)
  return counts
})

/**
 * Every public document in the same consultation as this one (a paper and the draft it consults
 * on: related documents that are out for consultation too), this one first. Empty when the document
 * is not out for consultation.
 */
export const consultationDocuments = (doc: RegulatoryDocument): RegulatoryDocument[] =>
  doc.consultation ? [doc, ...doc.related.filter((other) => other.consultation)] : []

export const documentHref = (doc: RegulatoryDocument): string => `${doc.categoryPath}/${doc.slug}`

const sizeOf = (bytes: number) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`)

/** "PDF, 2.5 MB, 20 pages", or without the pages when they are not given. */
export const fileSummary = (doc: RegulatoryDocument): string =>
  [doc.file.kind, sizeOf(doc.file.sizeBytes), ...(doc.file.pages ? [`${doc.file.pages} pages`] : [])].join(', ')
