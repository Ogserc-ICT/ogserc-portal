import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { HighlightsBlock } from '../blocks/Highlights'
import {
  attachmentsField,
  dayField,
  linkInsteadField,
  relatedDocumentsField,
  relatedLinksField,
  requiredUnlessLink,
  summaryField,
} from '../fields/common'
import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

// News stories (FR-NEWS-01, D-092, D-095): title, date, author, category, featured image, content,
// attachments, related documents. The photographs of a story sit with it (the NERC visit has seven);
// stand-alone photo and video galleries are their own collection (FR-NEWS-04). An item that only
// points at another page ("Order 002 is published") has a link instead of a story.
export const News: CollectionConfig = contentCollection({
  slug: 'news',
  labels: { singular: 'News story', plural: 'News' },
  defaultSort: '-publishedDate',
  admin: {
    defaultColumns: ['title', 'publishedDate', 'category', '_status'],
    listSearchableFields: ['title', 'summary'],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    slugField(),
    linkInsteadField(),
    {
      type: 'row',
      fields: [
        dayField('publishedDate', { required: true, index: true, label: 'Date' }),
        { name: 'author', type: 'text', maxLength: 120, admin: { description: 'Optional, for example "Corporate Communications".' } },
        { name: 'category', type: 'text', maxLength: 60, admin: { description: 'Optional, for example "Partnerships".' } },
      ],
    },
    summaryField(),
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Shown on the news card and at the top of the story. Its description (alt text) is set in Media.' },
    },
    {
      name: 'body',
      label: 'Story',
      type: 'richText',
      validate: requiredUnlessLink,
      editor: lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [HighlightsBlock] })] }),
    },
    {
      name: 'photos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: { description: 'More photographs, shown as a gallery under the story.' },
    },
    attachmentsField(),
    relatedDocumentsField(),
    relatedLinksField(),
  ],
})
