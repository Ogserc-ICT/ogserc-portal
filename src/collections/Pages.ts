import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

// Information pages (FR-CMS-02 "Pages", FR-CON-01, FR-MET-01, D-093): text staff can change
// without a developer, such as the consumer rights, metering guidance or a legal page. Build
// step 5 decides which existing pages read their text from here; the address is set by the page
// that shows it, so a page here is found by its web address (slug).
export const Pages: CollectionConfig = contentCollection({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  defaultSort: 'title',
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt', '_status'],
    listSearchableFields: ['title', 'summary'],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    slugField(),
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 300,
      admin: { description: 'Optional: shown under the title, and in search results and link previews.' },
    },
    { name: 'body', label: 'Text', type: 'richText', required: true },
  ],
})
