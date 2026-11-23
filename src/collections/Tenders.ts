import type { CollectionConfig } from 'payload'

import { attachmentsField, dateTimeField, dayField, summaryField } from '../fields/common'
import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

// Tenders (SRS Section 4 Media Center, FR-WEB-02 homepage list; D-092): OGSERC's invitations to bid.
// Whether a tender is open is worked out from its closing date when the page is shown, so nobody
// has to remember to close it.
export const Tenders: CollectionConfig = contentCollection({
  slug: 'tenders',
  labels: { singular: 'Tender', plural: 'Tenders' },
  defaultSort: '-publishedDate',
  admin: {
    defaultColumns: ['title', 'reference', 'closesAt', '_status'],
    listSearchableFields: ['title', 'reference', 'summary'],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    slugField(),
    {
      type: 'row',
      fields: [
        { name: 'reference', label: 'Reference number', type: 'text', index: true, maxLength: 80 },
        dayField('publishedDate', { required: true, index: true, label: 'Published' }),
        dateTimeField('closesAt', { required: true, index: true, label: 'Closing date and time' }),
      ],
    },
    summaryField(),
    { name: 'body', label: 'Details', type: 'richText', required: true },
    { name: 'enquiries', label: 'Enquiries email', type: 'email', admin: { description: 'Optional, only if the tender names one.' } },
    attachmentsField('The tender documents bidders download.'),
  ],
})
