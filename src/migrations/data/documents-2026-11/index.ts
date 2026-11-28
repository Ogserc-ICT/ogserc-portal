import { textOgsercOrd2026001 } from './text-ogserc-ord-2026-001'
import { textOgsercOrd2026002 } from './text-ogserc-ord-2026-002'
import type { DocumentBlock } from './types'

// A frozen copy (2026-11-28, D-102) of the four documents published before the Documents
// collection was used (src/lib/documents/catalogue.ts, D-060, D-070, D-071), in the collection's
// field names. 20261128_154400_documents puts them into the CMS, published. Never edit: the
// migration must put in the same documents wherever it runs. The files are in src/assets/documents/,
// which the Docker image includes.

export type FrozenConsultation = {
  closingDate: string
  hearingDate?: string
  hearingPlace?: string
  commentEmail: string
  commentAddress: string
  subjectLine?: string
}

export type FrozenDocument = {
  slug: string
  title: string
  category: 'orders-and-directives' | 'consultation'
  typeLabel: string
  reference: string
  publicationDate: string
  effectiveDate?: string
  description: string
  documentStatus: 'published'
  /** In src/assets/documents/. */
  sourceFile: string
  /** The file name visitors download, and its title in the document files. */
  fileName: string
  fileDescription: string
  filePages: number
  text?: DocumentBlock[]
  enquiries?: { email: string; note: string }
  consultation?: FrozenConsultation
  /** Slugs of the related documents. */
  related: string[]
  tags: string[]
}

// Consultation paper OGSERC/CP/2026/001: document control table, "How to respond" and "Hearing". The
// closing date (was 30 November) and hearing date (was 3 December) as extended, owner, 2026-11-28.
const CP_2026_001: FrozenConsultation = {
  closingDate: '2026-12-07',
  hearingDate: '2026-12-16',
  hearingPlace: 'Abeokuta',
  commentEmail: 'info@ogserc.org.ng',
  commentAddress: 'The Secretary to the Commission, OGSERC, Floor 5, OPIC Towers, Oke-Ilewo, Abeokuta',
  subjectLine: 'Response to CP/2026/001: Regularization of Distribution in the Areas',
}

export const documents: FrozenDocument[] = [
  {
    slug: 'ogserc-ord-2026-001',
    title:
      'Order on the Commencement of Operations of the Commission and the Mandatory Registration of Licensees and Electricity Operators in Ogun State, 2026',
    category: 'orders-and-directives',
    typeLabel: 'Order',
    reference: 'OGSERC/ORD/2026/001',
    publicationDate: '2026-10-26',
    effectiveDate: '2026-11-02',
    description:
      'This Order may be cited as the OGSERC Order on Commencement of Operations and Registration of Licensees and Electricity Operators, 2026.',
    documentStatus: 'published',
    sourceFile: 'ogserc-ord-2026-001.pdf',
    fileName: 'OGSERC-ORD-2026-001.pdf',
    fileDescription: 'Signed copy, scanned',
    filePages: 20,
    text: textOgsercOrd2026001,
    enquiries: {
      email: 'registration@ogserc.org.ng',
      note: 'Filings and enquiries under this Order go to the Commission by email or by hand at its principal office.',
    },
    related: [],
    tags: ['commencement', 'registration', 'licensees', 'operators'],
  },
  {
    slug: 'ogserc-ord-2026-002',
    title: 'Order on the Transitional Adoption of NERC Regulatory Instruments in the Ogun State Electricity Market',
    category: 'orders-and-directives',
    typeLabel: 'Order',
    reference: 'OGSERC/ORD/2026/002',
    publicationDate: '2026-11-02',
    effectiveDate: '2026-11-03',
    description: 'This Order may be cited as the OGSERC (Transitional Adoption of NERC Regulatory Instruments) Order, 2026.',
    documentStatus: 'published',
    sourceFile: 'ogserc-ord-2026-002.pdf',
    fileName: 'OGSERC-ORD-2026-002.pdf',
    fileDescription: 'Signed copy, scanned',
    filePages: 11,
    text: textOgsercOrd2026002,
    related: [],
    tags: ['transition', 'nerc', 'adopted instruments', 'tariffs', 'licences'],
  },
  {
    slug: 'ogserc-cp-2026-001',
    title:
      'Regularization of Unlicensed Electricity Distribution in the Sagamu Interchange, Ota and Agbara Areas, and Gas Supply for Embedded Generation',
    category: 'consultation',
    typeLabel: 'Consultation paper',
    reference: 'OGSERC/CP/2026/001',
    publicationDate: '2026-11-16',
    description:
      'On the proposed OGSERC (Establishment of the Ogun State Grid and the Ogun Electricity Market) Order, 2026. Issued for public consultation. Comments are invited from all stakeholders.',
    documentStatus: 'published',
    sourceFile: 'ogserc-cp-2026-001.pdf',
    fileName: 'OGSERC-CP-2026-001.pdf',
    fileDescription: 'Consultation paper, version 2026.2',
    filePages: 24,
    consultation: CP_2026_001,
    related: ['draft-order-state-grid-and-ogem'],
    tags: ['consultation', 'state grid', 'ogem', 'industrial distribution zones', 'gas'],
  },
  {
    slug: 'draft-order-state-grid-and-ogem',
    title:
      'Order on the Establishment of the Ogun State Grid and the Ogun Electricity Market, Gas Supply for Embedded Generation Connected to the State Grid, and the Regularisation of Unlicensed Distribution and Third-Party Investment in Industrial Distribution Zones in Ogun State',
    category: 'consultation',
    typeLabel: 'Draft Order',
    reference: 'OGSERC/ORD/2026/[●] (draft)',
    publicationDate: '2026-11-16',
    description:
      'Published in draft with Consultation Paper OGSERC/CP/2026/[●]. Not yet made by the Commission; no legal effect.',
    documentStatus: 'published',
    sourceFile: 'draft-order-state-grid-and-ogem.pdf',
    fileName: 'OGSERC-Draft-Order-State-Grid-and-OGEM.pdf',
    fileDescription: 'Draft Order for consultation, version 2026.1',
    filePages: 63,
    consultation: CP_2026_001,
    related: ['ogserc-cp-2026-001'],
    tags: ['draft', 'consultation', 'state grid', 'ogem', 'industrial distribution zones', 'gas'],
  },
]
