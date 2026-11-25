import type { CollectionConfig } from 'payload'

import {
  attachmentsField,
  dayField,
  linkInsteadField,
  relatedDocumentsField,
  relatedLinksField,
  requiredUnlessLink,
  summaryField,
  validateOptionalSiteLink,
} from '../fields/common'
import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

/** The four kinds of announcement (FR-NEWS-03), with the labels already used on the site. */
export const ANNOUNCEMENT_CATEGORIES = [
  { value: 'public-notice', label: 'Public notice' },
  { value: 'regulatory-notice', label: 'Regulatory notice' },
  { value: 'service-announcement', label: 'Service announcement' },
  { value: 'consultation-notice', label: 'Consultation notice' },
] as const

// Announcements (FR-NEWS-03, FR-WEB-04, D-092, D-095): public notices and the like, shown on the
// homepage and sortable by date. Their wording is OGSERC's, as issued. Besides the text, a notice can
// carry bank accounts for payments (the Forms page shows the registration notice's, D-066), where
// questions go, and who signed it.
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
    linkInsteadField(),
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
        { name: 'issuedAt', label: 'Place of issue', type: 'text', maxLength: 80, admin: { description: 'Optional, for example "Abeokuta".' } },
      ],
    },
    summaryField(),
    {
      name: 'issuedUnder',
      type: 'group',
      admin: { description: 'Optional: the instrument the notice is issued under, shown under its title, for example Order No. OGSERC/ORD/2026/001.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', maxLength: 40, admin: { description: 'For example "Order No."' } },
            { name: 'reference', type: 'text', maxLength: 80 },
            { name: 'link', type: 'text', validate: validateOptionalSiteLink },
          ],
        },
      ],
    },
    { name: 'body', label: 'Text of the notice', type: 'richText', validate: requiredUnlessLink },
    {
      name: 'payment',
      label: 'Payment details',
      type: 'group',
      admin: { description: 'Optional: bank accounts the notice gives for payments, exactly as printed.' },
      fields: [
        { name: 'intro', type: 'textarea', maxLength: 400 },
        {
          name: 'accounts',
          type: 'array',
          maxRows: 10,
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'accountName', type: 'text', required: true, maxLength: 120 },
                { name: 'accountNumber', type: 'text', required: true, maxLength: 20 },
                { name: 'bank', type: 'text', required: true, maxLength: 80 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'description', label: 'What it is for', type: 'text', required: true, maxLength: 120 },
                { name: 'amount', type: 'text', required: true, maxLength: 120 },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'enquiries',
      type: 'group',
      admin: { description: 'Optional: where questions go, only if the notice says so.' },
      fields: [
        { name: 'note', type: 'text', maxLength: 300 },
        { name: 'email', type: 'email' },
      ],
    },
    {
      name: 'signOff',
      type: 'group',
      admin: { description: 'Optional: the closing line and who signed the notice.' },
      fields: [
        { name: 'closing', type: 'text', maxLength: 200 },
        { name: 'signatories', type: 'textarea', maxLength: 400 },
      ],
    },
    attachmentsField('The signed notice or other files, if any.'),
    relatedDocumentsField(),
    relatedLinksField(),
  ],
})
