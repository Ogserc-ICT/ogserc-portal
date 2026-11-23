import type { CollectionConfig } from 'payload'

import { attachmentsField, dateTimeField, relatedDocumentsField, summaryField, validateHttpsUrl } from '../fields/common'
import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

// Events (FR-NEWS-02, D-092): name, date, venue, description, registration link (if any), documents.
export const Events: CollectionConfig = contentCollection({
  slug: 'events',
  labels: { singular: 'Event', plural: 'Events' },
  defaultSort: '-startsAt',
  admin: {
    defaultColumns: ['title', 'startsAt', 'venue', '_status'],
    listSearchableFields: ['title', 'venue', 'summary'],
  },
  fields: [
    { name: 'title', label: 'Name', type: 'text', required: true, maxLength: 200 },
    slugField(),
    {
      type: 'row',
      fields: [
        dateTimeField('startsAt', { required: true, index: true, label: 'Starts' }),
        dateTimeField('endsAt', { label: 'Ends', admin: { description: 'Optional.' } }),
      ],
    },
    { name: 'venue', type: 'text', required: true, maxLength: 200 },
    summaryField(),
    { name: 'body', label: 'Description', type: 'richText' },
    {
      name: 'registrationLink',
      type: 'text',
      validate: validateHttpsUrl,
      admin: { description: 'Optional: where to register, starting with https://.' },
    },
    attachmentsField('Programme, papers or other files for the event.'),
    relatedDocumentsField(),
  ],
})
