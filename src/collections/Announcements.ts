import type { CollectionConfig } from 'payload'

import { attachmentsField, dayField, relatedDocumentsField, summaryField } from '../fields/common'
import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

/** The four kinds of announcement (FR-NEWS-03), with the labels already used on the site. */
export const ANNOUNCEMENT_CATEGORIES = [
  { value: 'public-notice', label: 'Public notice' },
  { value: 'regulatory-notice', label: 'Regulatory notice' },
  { value: 'service-announcement', label: 'Service announcement' },
  { value: 'consultation-notice', label: 'Consultation notice' },
] as const

// Announcements (FR-NEWS-03, FR-WEB-04, D-092): public notices and the like, shown on the homepage
// and sortable by date. Their wording is OGSERC's, as issued.
export const Announcements: CollectionConfig = contentCollection({
  slug: 'announcements',
  labels: { singular: 'Announcement', plural: 'Announcements' },
  defaultSort: '-postedDate',
  admin: {
    defaultColumns: ['title', 'category', 'postedDate', '_status'],
    listSearchableFields: ['title', 'summary'],
    description: 'Public notices, regulatory notices, service announcements and consultation notices, worded exactly as issued.',
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    slugField(),
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'select',
          required: true,
          index: true,
          options: ANNOUNCEMENT_CATEGORIES.map(({ value, label }) => ({ value, label })),
        },
        dayField('postedDate', { required: true, index: true, label: 'Posted on the site', admin: { description: 'Lists sort by this date.' } }),
        dayField('issuedDate', { label: 'Date on the notice', admin: { description: 'Optional, if different.' } }),
      ],
    },
    summaryField(),
    { name: 'body', label: 'Text of the notice', type: 'richText', required: true },
    attachmentsField('The signed notice or other files, if any.'),
    relatedDocumentsField(),
  ],
})
