import type { CollectionConfig } from 'payload'

import { contentCollection } from './content/content-collection'

// Frequently asked questions (SRS Section 4 utility bar, FR-CON-01, FR-MET-01, D-093). Grouped by a
// topic OGSERC names (for example "Metering" or "Complaints"), and ordered by a number within it.
export const Faqs: CollectionConfig = contentCollection({
  slug: 'faqs',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  defaultSort: 'order',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'topic', 'order', '_status'],
    listSearchableFields: ['title', 'topic'],
  },
  fields: [
    { name: 'title', label: 'Question', type: 'text', required: true, maxLength: 300 },
    { name: 'answer', type: 'richText', required: true },
    {
      type: 'row',
      fields: [
        { name: 'topic', type: 'text', required: true, index: true, maxLength: 60, admin: { description: 'Questions with the same topic are shown together.' } },
        { name: 'order', type: 'number', defaultValue: 100, min: 0, max: 10000, admin: { description: 'Smaller numbers come first.' } },
      ],
    },
  ],
})
