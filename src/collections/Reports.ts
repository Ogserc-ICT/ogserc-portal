import type { CollectionConfig } from 'payload'

import { dayField, summaryField } from '../fields/common'
import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

/** The kinds of report FR-REP-01 names. */
export const REPORT_TYPES = [
  { value: 'annual', label: 'Annual report' },
  { value: 'quarterly', label: 'Quarterly report' },
  { value: 'regulatory-performance', label: 'Regulatory performance report' },
  { value: 'market', label: 'Market report' },
  { value: 'consumer', label: 'Consumer report' },
  { value: 'research', label: 'Research' },
  { value: 'statistics', label: 'Statistics' },
] as const

// Reports and publications (FR-REP-01/02, D-093): title, type, period, date, summary, file and an
// optional thumbnail. Infographics and data tables (FR-REP-03) are a report with images or a
// spreadsheet attached, until OGSERC supplies some and a page needs more.
export const Reports: CollectionConfig = contentCollection({
  slug: 'reports',
  labels: { singular: 'Report or publication', plural: 'Reports and publications' },
  defaultSort: '-publishedDate',
  admin: {
    defaultColumns: ['title', 'reportType', 'period', 'publishedDate', '_status'],
    listSearchableFields: ['title', 'period', 'summary'],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    slugField(),
    {
      type: 'row',
      fields: [
        {
          name: 'reportType',
          label: 'Type',
          type: 'select',
          required: true,
          index: true,
          options: REPORT_TYPES.map(({ value, label }) => ({ value, label })),
        },
        { name: 'period', type: 'text', required: true, maxLength: 60, admin: { description: 'For example "2026", "Q3 2026" or "January to June 2026".' } },
        dayField('publishedDate', { required: true, index: true, label: 'Date' }),
      ],
    },
    summaryField(),
    { name: 'file', type: 'upload', relationTo: 'document-files', required: true },
    { name: 'thumbnail', type: 'upload', relationTo: 'media', admin: { description: 'Optional cover image.' } },
    {
      name: 'images',
      label: 'Infographics',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: { description: 'Optional images shown on the report’s page (FR-REP-03).' },
    },
  ],
})
