import type { CollectionConfig, Condition } from 'payload'

import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

// Regulatory documents (SRS FR-DOC-01/02/05, FR-DRAFT-01, FR-CODE-01/02, D-091). One collection for
// every Regulatory Instruments category; the category decides which listing page shows a document.
// Its fields follow src/lib/documents/types.ts, so the documents now in catalogue.ts move in
// unchanged in build step 6.

/** The Regulatory Instruments categories (FR-DOC-01), in menu order. Values are the page addresses. */
export const DOCUMENT_CATEGORIES = [
  { value: 'rules-and-regulations', label: 'Rules & Regulations' },
  { value: 'energy-caps', label: 'Energy Caps' },
  { value: 'guidelines', label: 'Guidelines' },
  { value: 'forms', label: 'Forms' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'licences', label: 'Licences' },
  { value: 'orders-and-directives', label: 'Orders & Directives' },
  { value: 'codes', label: 'Codes' },
  { value: 'manuals', label: 'Manuals' },
  { value: 'market-documents', label: 'Market Documents' },
  { value: 'standards', label: 'Standards' },
] as const

/**
 * A document's legal standing (FR-DOC-02). Separate from the CMS's draft/published state: a draft
 * is never public, while a superseded or revoked document stays public, clearly labelled (FR-DOC-05).
 */
export const DOCUMENT_STATUSES = [
  { value: 'published', label: 'Published (in force)' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'revoked', label: 'Revoked' },
] as const

const inCategory =
  (category: string): Condition =>
  (data) =>
    (data as { category?: unknown } | undefined)?.category === category

const isSuperseded: Condition = (data) => (data as { documentStatus?: unknown } | undefined)?.documentStatus === 'superseded'

/** Lets a document point at other documents, never at itself. */
const otherDocuments = ({ id }: { id?: number | string }) => (id === undefined ? true : { id: { not_equals: id } })

export const Documents: CollectionConfig = contentCollection({
  slug: 'documents',
  labels: { singular: 'Regulatory document', plural: 'Regulatory documents' },
  defaultSort: '-publicationDate',
  admin: {
    defaultColumns: ['title', 'category', 'reference', 'documentStatus', 'publicationDate', '_status'],
    listSearchableFields: ['title', 'reference', 'description'],
    description:
      'Regulations, orders, codes, guidelines, standards, forms and other regulatory instruments. Only documents OGSERC has issued: never write or change their wording here.',
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 400 },
    slugField(),
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'select',
          required: true,
          index: true,
          options: DOCUMENT_CATEGORIES.map(({ value, label }) => ({ value, label })),
          admin: { description: 'Decides which Regulatory Instruments page lists it.' },
        },
        {
          name: 'typeLabel',
          label: 'Kind of document',
          type: 'text',
          maxLength: 80,
          admin: { description: 'As the document calls itself, for example "Order" or "Consultation paper".' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'reference', label: 'Reference number', type: 'text', index: true, maxLength: 80 },
        {
          name: 'documentStatus',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'published',
          index: true,
          options: DOCUMENT_STATUSES.map(({ value, label }) => ({ value, label })),
          admin: { description: 'Superseded and revoked documents stay on the site, labelled as such.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'publicationDate', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'effectiveDate', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
      ],
    },
    {
      name: 'supersededBy',
      type: 'relationship',
      relationTo: 'documents',
      filterOptions: otherDocuments,
      admin: { condition: isSuperseded, description: 'The document that replaces this one, if it is on the site.' },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      maxLength: 1500,
      admin: { description: 'Shown on listings and under the title. Take it from the document itself (for example its citation paragraph).' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'file',
          type: 'upload',
          relationTo: 'document-files',
          required: true,
          admin: { description: 'The PDF, Word or Excel file visitors download.' },
        },
        {
          name: 'fileDescription',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Shown beside the file, for example "Signed copy, scanned".' },
        },
      ],
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional cover image for listings.' },
    },
    {
      name: 'body',
      label: 'Full text',
      type: 'richText',
      admin: { description: 'Optional: the document’s text, exactly as issued, so it can be read and searched on the page.' },
    },
    {
      name: 'codeFamily',
      type: 'text',
      maxLength: 120,
      admin: {
        condition: inCategory('codes'),
        description: 'For the Codes page (FR-CODE-01), for example "Distribution Code" or "Metering Code".',
      },
    },
    {
      name: 'consultation',
      type: 'group',
      admin: {
        condition: inCategory('consultation'),
        description: 'For a document published for comment (FR-DRAFT-01), as its consultation notice sets out.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'closingDate', label: 'Comments close on', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
            { name: 'commentEmail', label: 'Comments by email to', type: 'email' },
          ],
        },
        { name: 'commentAddress', label: 'Comments by hand or post to', type: 'textarea', maxLength: 400 },
        { name: 'subjectLine', label: 'Subject line respondents should use', type: 'text', maxLength: 200 },
        {
          type: 'row',
          fields: [
            { name: 'hearingDate', label: 'Public hearing date', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
            { name: 'hearingPlace', label: 'Public hearing place', type: 'text', maxLength: 200 },
          ],
        },
        {
          name: 'finalDocument',
          label: 'Final document, once adopted',
          type: 'relationship',
          relationTo: 'documents',
          filterOptions: otherDocuments,
        },
      ],
    },
    {
      name: 'enquiries',
      type: 'group',
      admin: { description: 'Where questions about the document go, only if the document itself says so.' },
      fields: [
        { name: 'email', type: 'email' },
        { name: 'note', type: 'text', maxLength: 300 },
      ],
    },
    {
      name: 'related',
      label: 'Related documents',
      type: 'relationship',
      relationTo: 'documents',
      hasMany: true,
      filterOptions: otherDocuments,
    },
    { name: 'tags', type: 'text', hasMany: true, maxLength: 60 },
  ],
})
