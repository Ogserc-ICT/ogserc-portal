import { textOgsercOrd2026001 } from './text-ogserc-ord-2026-001'
import { textOgsercOrd2026002 } from './text-ogserc-ord-2026-002'
import type { Consultation, RegulatoryDocument } from './types'

// Consultation paper OGSERC/CP/2026/001: document control table, "How to respond" and "Hearing".
const CP_2026_001: Consultation = {
  closingDate: '2026-11-30',
  hearing: { date: '2026-12-03', place: 'Abeokuta' },
  email: 'info@ogserc.org.ng',
  address: 'The Secretary to the Commission, OGSERC, Floor 5, OPIC Towers, Oke-Ilewo, Abeokuta',
  subjectLine: 'Response to CP/2026/001: Regularization of Distribution in the Areas',
}

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
  // D-071: the consultation paper and the draft Order it consults on, published together.
  {
    slug: 'ogserc-cp-2026-001',
    title:
      'Regularization of Unlicensed Electricity Distribution in the Sagamu Interchange, Ota and Agbara Areas, and Gas Supply for Embedded Generation',
    categoryPath: '/regulatory-instruments/consultation',
    typeLabel: 'Consultation paper',
    reference: 'OGSERC/CP/2026/001',
    // Cover page: "Date of issue: 16 November 2026".
    publicationDate: '2026-11-16',
    // Cover page, under the title.
    description:
      'On the proposed OGSERC (Establishment of the Ogun State Grid and the Ogun Electricity Market) Order, 2026. Issued for public consultation. Comments are invited from all stakeholders.',
    status: 'published',
    file: {
      href: '/documents/consultation/ogserc-cp-2026-001.pdf',
      downloadName: 'OGSERC-CP-2026-001.pdf',
      sizeBytes: 1_024_513,
      pages: 24,
      description: 'Consultation paper, version 2026.2',
    },
    consultation: CP_2026_001,
    related: ['draft-order-state-grid-and-ogem'],
    tags: ['consultation', 'state grid', 'ogem', 'industrial distribution zones', 'gas'],
  },
  {
    slug: 'draft-order-state-grid-and-ogem',
    title:
      'Order on the Establishment of the Ogun State Grid and the Ogun Electricity Market, Gas Supply for Embedded Generation Connected to the State Grid, and the Regularisation of Unlicensed Distribution and Third-Party Investment in Industrial Distribution Zones in Ogun State',
    categoryPath: '/regulatory-instruments/consultation',
    typeLabel: 'Draft Order',
    // As printed on the cover: the draft leaves the number blank. The consultation paper calls it
    // Order No. OGSERC/ORD/2026/003; use that once OGSERC confirms it.
    reference: 'OGSERC/ORD/2026/[●] (draft)',
    // Cover page: "Date of publication of draft: 16 November 2026".
    publicationDate: '2026-11-16',
    // Cover page, under the title.
    description:
      'Published in draft with Consultation Paper OGSERC/CP/2026/[●]. Not yet made by the Commission; no legal effect.',
    status: 'published',
    file: {
      href: '/documents/consultation/draft-order-state-grid-and-ogem.pdf',
      downloadName: 'OGSERC-Draft-Order-State-Grid-and-OGEM.pdf',
      // OGSERC's file with Article 47.3's email corrected to .org.ng at the owner's request (D-071).
      sizeBytes: 1_263_976,
      pages: 63,
      description: 'Draft Order for consultation, version 2026.1',
    },
    consultation: CP_2026_001,
    related: ['ogserc-cp-2026-001'],
    tags: ['draft', 'consultation', 'state grid', 'ogem', 'industrial distribution zones', 'gas'],
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

/** The related documents that are public, in the order given. */
export const relatedDocuments = (doc: RegulatoryDocument): RegulatoryDocument[] =>
  doc.related.flatMap((slug) => publicDocuments.filter((other) => other.slug === slug))

export const countInCategory = (categoryPath: string): number =>
  publicDocuments.filter((doc) => doc.categoryPath === categoryPath).length

export const documentHref = (doc: RegulatoryDocument): string => `${doc.categoryPath}/${doc.slug}`

/** "PDF, 2.5 MB, 20 pages". */
export const fileSummary = (doc: RegulatoryDocument): string =>
  `PDF, ${(doc.file.sizeBytes / 1_000_000).toFixed(1)} MB, ${doc.file.pages} pages`
