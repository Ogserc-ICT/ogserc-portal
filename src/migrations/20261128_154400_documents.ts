import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

import { documents, type FrozenDocument } from './data/documents-2026-11'
import type { DocumentBlock } from './data/documents-2026-11/types'

// Moves the four documents published from code (src/lib/documents/catalogue.ts, D-060, D-070,
// D-071) into the Documents collection, published (D-102): each PDF into the document files (object
// storage on the server), the details field by field, and the full text into rich text word for
// word, with the table and signatories blocks. It reads only ./data/ and src/assets/documents/,
// never the app's modules, so it keeps working after they change. A document whose web address is
// taken is left alone, so it never replaces staff's work.

const FILES = path.resolve(process.cwd(), 'src/assets/documents')

// --- Rich text ---------------------------------------------------------------------------------

const BOLD = 1
const ITALIC = 2
/** The opening words the site shows in bold (as src/components/documents/DocumentText.tsx did). */
const LEAD = /^(WHEREAS:|NOW THEREFORE|MADE)/

const textNode = (text: string, format = 0) => ({ type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' })
const element = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  direction: null,
  format: '',
  indent: 0,
  ...extra,
  children,
})
const block = (fields: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { blockName: '', ...fields } })

function paragraphRuns(block: Extract<DocumentBlock, { type: 'paragraph' }>) {
  if (block.note) return [textNode(block.text, ITALIC)]
  const lead = block.strongLead ? LEAD.exec(block.text)?.[0] : undefined
  if (!lead) return [textNode(block.text)]
  const rest = block.text.slice(lead.length)
  return rest ? [textNode(lead, BOLD), textNode(rest)] : [textNode(lead, BOLD)]
}

/** One block of a frozen text as a rich-text node. Exported for the round-trip test. */
export function blockToNode(item: DocumentBlock): unknown {
  switch (item.type) {
    case 'heading':
      return element('heading', [textNode(item.text)], { tag: item.level === 2 ? 'h2' : 'h3' })
    case 'paragraph':
      return element('paragraph', paragraphRuns(item), { textFormat: 0, indent: item.indent ? 1 : 0 })
    case 'list':
      return element(
        'list',
        item.items.map((text, n) => element('listitem', [textNode(text)], { value: n + 1 })),
        { listType: 'bullet', tag: 'ul', start: 1 },
      )
    case 'table':
      return block({
        blockType: 'documentTable',
        ...(item.caption ? { caption: item.caption } : {}),
        columns: item.head.map((heading) => ({ heading })),
        rows: item.rows.map((row) => ({ cells: row.map((text) => ({ text })) })),
      })
    case 'signatories':
      return block({ blockType: 'signatories', people: item.people.map((person) => ({ ...person })) })
  }
}

export const richText = (blocks: DocumentBlock[]) => ({ root: element('root', blocks.map(blockToNode)) })

// --- Files -------------------------------------------------------------------------------------

/**
 * With S3, the storage plugin reuses the first file of a request for every later upload in it
 * unless this is cleared before each (D-097).
 */
function forgetPreviousUpload(req: PayloadRequest) {
  if (req.context) delete (req.context as Record<string, unknown>)._payloadCloudStorage
  req.file = undefined
  req.payloadUploadSizes = undefined
}

type Api = MigrateUpArgs['payload']
type Id = number | string

async function uploadFile(api: Api, req: PayloadRequest, doc: FrozenDocument): Promise<Id> {
  // Reused only if it is this migration's own upload (same file name and title).
  const { docs } = await api.find({
    collection: 'document-files',
    where: { and: [{ filename: { equals: doc.fileName } }, { title: { equals: doc.reference } }] },
    limit: 1,
    depth: 0,
    req,
  })
  if (docs[0]) return docs[0].id as Id
  forgetPreviousUpload(req)
  const data = await readFile(path.join(FILES, doc.sourceFile))
  const created = await api.create({
    collection: 'document-files',
    data: { title: doc.reference },
    file: { data, mimetype: 'application/pdf', name: doc.fileName, size: data.length },
    req,
  })
  return created.id as Id
}

// --- Documents ---------------------------------------------------------------------------------

function fields(doc: FrozenDocument, file: Id) {
  return {
    title: doc.title,
    slug: doc.slug,
    category: doc.category,
    typeLabel: doc.typeLabel,
    reference: doc.reference,
    documentStatus: doc.documentStatus,
    publicationDate: `${doc.publicationDate}T00:00:00.000Z`,
    ...(doc.effectiveDate ? { effectiveDate: `${doc.effectiveDate}T00:00:00.000Z` } : {}),
    description: doc.description,
    file,
    fileDescription: doc.fileDescription,
    filePages: doc.filePages,
    ...(doc.text ? { body: richText(doc.text) } : {}),
    ...(doc.enquiries ? { enquiries: doc.enquiries } : {}),
    ...(doc.consultation
      ? {
          consultation: {
            ...doc.consultation,
            closingDate: `${doc.consultation.closingDate}T00:00:00.000Z`,
            ...(doc.consultation.hearingDate ? { hearingDate: `${doc.consultation.hearingDate}T00:00:00.000Z` } : {}),
          },
        }
      : {}),
    tags: doc.tags,
    _status: 'published' as const,
  }
}

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const added = new Map<string, Id>()
  for (const doc of documents) {
    const { totalDocs } = await payload.count({ collection: 'documents', where: { slug: { equals: doc.slug } }, req })
    if (totalDocs > 0) continue
    const file = await uploadFile(payload, req, doc)
    const created = await payload.create({ collection: 'documents', data: fields(doc, file) as never, req })
    added.set(doc.slug, created.id as Id)
  }
  // Related documents once all exist, and only between documents this migration added.
  for (const doc of documents) {
    const id = added.get(doc.slug)
    const related = doc.related.flatMap((slug) => (added.has(slug) ? [added.get(slug)!] : []))
    if (id === undefined || related.length === 0) continue
    await payload.update({ collection: 'documents', id, data: { related, _status: 'published' } as never, req })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  const slugs = documents.map((doc) => doc.slug)
  await payload.delete({ collection: 'documents', where: { slug: { in: slugs } }, req })
  await payload.delete({ collection: 'document-files', where: { title: { in: documents.map((doc) => doc.reference) } }, req })
}
