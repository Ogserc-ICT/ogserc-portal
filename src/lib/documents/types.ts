// Regulatory documents (SRS FR-DOC-02). Until the Documents collection exists (build steps 4 and 6)
// they are listed in catalogue.ts; the fields follow FR-DOC-02 so the move to the CMS is direct.

export type DocumentStatus = 'draft' | 'published' | 'superseded' | 'revoked'

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  superseded: 'Superseded',
  revoked: 'Revoked',
}

/** The full text of a document, as structured blocks rendered by DocumentText. */
export type DocumentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | {
      type: 'paragraph'
      text: string
      /** A lettered or numbered item under a sub-paragraph. */
      indent?: boolean
      /** The opening words ("WHEREAS:", "NOW THEREFORE", "MADE at") are shown in bold. */
      strongLead?: boolean
      /** A reference line under a schedule heading, such as "(Paragraph 12)". */
      note?: boolean
    }
  | { type: 'list'; items: string[] }
  | { type: 'table'; caption?: string; head: string[]; rows: string[][] }
  | { type: 'signatories'; people: { name: string; role: string; organisation: string }[] }

export type DocumentFile = {
  /** Path under public/. */
  href: string
  /** File name offered when downloading. */
  downloadName: string
  sizeBytes: number
  pages: number
  /** Shown beside the file, e.g. "Signed copy, scanned". */
  description: string
}

export type Consultation = {
  /** ISO date: the last day for written comments. */
  closingDate: string
  hearing?: { date: string; place: string }
  email: string
  /** Where comments may be delivered by hand. */
  address: string
  /** The subject line the paper asks respondents to use. */
  subjectLine?: string
}

export type RegulatoryDocument = {
  slug: string
  title: string
  /** Path of the category page, matching the Regulatory Instruments menu. */
  categoryPath: string
  /** Singular name of the document type, e.g. "Order". */
  typeLabel: string
  reference: string
  /** ISO dates (YYYY-MM-DD). */
  publicationDate: string
  effectiveDate?: string
  /** Shown on the listing card and under the title. Taken from the document, never written for it. */
  description: string
  status: DocumentStatus
  file: DocumentFile
  text?: DocumentBlock[]
  /** Where questions about the document go, as the document itself says. */
  enquiries?: { email: string; note: string }
  /** A document published for comment (FR-DRAFT-01, FR-DRAFT-02), as the consultation paper sets out. */
  consultation?: Consultation
  /** Slugs of related documents. */
  related: string[]
  tags: string[]
}
