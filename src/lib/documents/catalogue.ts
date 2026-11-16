import { textOgsercOrd2026001 } from './text-ogserc-ord-2026-001'
import { textOgsercOrd2026002 } from './text-ogserc-ord-2026-002'
import type { RegulatoryDocument } from './types'

/**
 * TEMPORARY EXCEPTION, like placeholder-content.ts (D-028, D-060): documents published before the
 * Documents collection exists. Every entry is a real OGSERC document supplied by the owner, with
 * its details taken from the document itself. Build step 6 moves them into the CMS.
 */
const documents: RegulatoryDocument[] = [
  {
    slug: 'ogserc-ord-2026-001',
    title:
      'Order on the Commencement of Operations of the Commission and the Mandatory Registration of Licensees and Electricity Operators in Ogun State, 2026',
    categoryPath: '/regulatory-instruments/orders-and-directives',
    typeLabel: 'Order',
    reference: 'OGSERC/ORD/2026/001',
    publicationDate: '2026-10-26',
    effectiveDate: '2026-11-02',
    // Paragraph 1 (Citation) of the Order.
    description:
      'This Order may be cited as the OGSERC Order on Commencement of Operations and Registration of Licensees and Electricity Operators, 2026.',
    status: 'published',
    file: {
      href: '/documents/orders-and-directives/ogserc-ord-2026-001.pdf',
      downloadName: 'OGSERC-ORD-2026-001.pdf',
      sizeBytes: 2_464_964,
      pages: 20,
      description: 'Signed copy, scanned',
    },
    text: textOgsercOrd2026001,
    // Paragraph 10(2) of the Order.
    enquiries: {
      email: 'registration@ogserc.org.ng',
      note: 'Filings and enquiries under this Order go to the Commission by email or by hand at its principal office.',
    },
    related: [],
    tags: ['commencement', 'registration', 'licensees', 'operators'],
  },
  {
    slug: 'ogserc-ord-2026-002',
    title:
      'Order on the Transitional Adoption of NERC Regulatory Instruments in the Ogun State Electricity Market',
    categoryPath: '/regulatory-instruments/orders-and-directives',
    typeLabel: 'Order',
    reference: 'OGSERC/ORD/2026/002',
    // "Dated at Abeokuta this 2nd day of November 2026" (page 9); paragraph 2 sets 3 November.
    publicationDate: '2026-11-02',
    effectiveDate: '2026-11-03',
    // Paragraph 1 (Citation) of the Order.
    description:
      'This Order may be cited as the OGSERC (Transitional Adoption of NERC Regulatory Instruments) Order, 2026.',
    status: 'published',
    file: {
      href: '/documents/orders-and-directives/ogserc-ord-2026-002.pdf',
      downloadName: 'OGSERC-ORD-2026-002.pdf',
      sizeBytes: 3_355_192,
      pages: 11,
      description: 'Signed copy, scanned',
    },
    text: textOgsercOrd2026002,
    related: [],
    tags: ['transition', 'nerc', 'adopted instruments', 'tariffs', 'licences'],
  },
]

/** Documents the public may see: never drafts (CLAUDE.md security rules). */
const publicDocuments = documents.filter((doc) => doc.status !== 'draft')

const newestFirst = (a: RegulatoryDocument, b: RegulatoryDocument) =>
  b.publicationDate.localeCompare(a.publicationDate)

export const documentsInCategory = (categoryPath: string): RegulatoryDocument[] =>
  publicDocuments.filter((doc) => doc.categoryPath === categoryPath).sort(newestFirst)

export const findDocument = (categoryPath: string, slug: string): RegulatoryDocument | undefined =>
  publicDocuments.find((doc) => doc.categoryPath === categoryPath && doc.slug === slug)

export const countInCategory = (categoryPath: string): number =>
  publicDocuments.filter((doc) => doc.categoryPath === categoryPath).length

export const documentHref = (doc: RegulatoryDocument): string => `${doc.categoryPath}/${doc.slug}`

/** "PDF, 2.5 MB, 20 pages". */
export const fileSummary = (doc: RegulatoryDocument): string =>
  `PDF, ${(doc.file.sizeBytes / 1_000_000).toFixed(1)} MB, ${doc.file.pages} pages`
