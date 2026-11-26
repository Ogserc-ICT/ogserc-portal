import type { Field, GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { allowAll, isPublisherOrAbove } from '../access'
import { PUBLIC_READ } from '../access/two-factor'
import { changedFields, recordAudit, requestActor } from '../lib/audit/record'

// The four About OGSERC pages (SRS Section 4, FR-CMS-01, D-098): About Us, Our History, Vision,
// Mission and Values, and OGSERC's Structure. Each page has fields that match its layout (paragraphs,
// the "What we do" cards, key dates, the PRIDE values, the divisions and their units), so staff edit
// the words and the approved design stays. Public to read; publishers and administrators change it,
// like the site settings, and each change is in the audit log. Section headings stay in code.

/** Icons staff can pick for a "What we do" card; each name is an Icon in src/components/ui/Icon.tsx. */
export const ABOUT_ICONS = [
  { value: 'licence', label: 'Licence' },
  { value: 'scales', label: 'Scales' },
  { value: 'bolt', label: 'Lightning bolt' },
  { value: 'eye', label: 'Eye' },
  { value: 'megaphone', label: 'Megaphone' },
  { value: 'document', label: 'Document' },
  { value: 'register', label: 'Register' },
  { value: 'question', label: 'Question mark' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'clock', label: 'Clock' },
  { value: 'mapPin', label: 'Map pin' },
  { value: 'phone', label: 'Phone' },
  { value: 'mail', label: 'Envelope' },
] as const

const description = (page: string): Field => ({
  name: 'description',
  label: 'Search engine description',
  type: 'textarea',
  required: true,
  maxLength: 300,
  admin: { description: `One or two sentences shown under the page’s title in search results for ${page}.` },
})

const paragraphs = (name: string, label: string, maxRows = 10): Field => ({
  name,
  label,
  type: 'array',
  minRows: 1,
  maxRows,
  labels: { singular: 'Paragraph', plural: 'Paragraphs' },
  fields: [{ name: 'text', type: 'textarea', required: true, maxLength: 1500 }],
})

const units: Field = {
  name: 'units',
  type: 'array',
  minRows: 1,
  maxRows: 12,
  labels: { singular: 'Unit', plural: 'Units' },
  fields: [{ name: 'name', type: 'text', required: true, maxLength: 100 }],
}

const SECTIONS = ['aboutUs', 'history', 'mission', 'structure']

const auditAbout: GlobalAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const fields = changedFields(SECTIONS, previousDoc, doc)
  if (fields.length > 0) {
    await recordAudit(req, { action: 'settings.updated', actor: requestActor(req), target: { type: 'about-ogserc', id: 'about-ogserc', label: 'About OGSERC' }, details: { fields } })
  }
  return doc
}

export const AboutOgserc: GlobalConfig = {
  slug: 'about-ogserc',
  label: 'About OGSERC',
  admin: { description: 'The four About OGSERC pages. Changes show on the site straight away.' },
  custom: PUBLIC_READ,
  access: {
    read: allowAll,
    update: isPublisherOrAbove,
  },
  versions: { max: 50 },
  hooks: { afterChange: [auditAbout] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'About Us',
          fields: [
            {
              name: 'aboutUs',
              label: false,
              type: 'group',
              fields: [
                description('About Us'),
                paragraphs('introduction', 'Introduction'),
                {
                  name: 'whatWeDo',
                  label: 'What we do',
                  type: 'array',
                  minRows: 1,
                  maxRows: 12,
                  labels: { singular: 'Card', plural: 'Cards' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'title', type: 'text', required: true, maxLength: 80 },
                        { name: 'icon', type: 'select', required: true, options: [...ABOUT_ICONS] },
                      ],
                    },
                    { name: 'text', type: 'textarea', required: true, maxLength: 400 },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Our History',
          fields: [
            {
              name: 'history',
              label: false,
              type: 'group',
              fields: [
                description('Our History'),
                paragraphs('paragraphs', 'The story'),
                {
                  name: 'keyDates',
                  label: 'Key dates',
                  type: 'array',
                  maxRows: 30,
                  admin: { description: 'Shown as a timeline beside the story, in this order.' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'date', type: 'text', required: true, maxLength: 40, admin: { description: 'As it should read, for example "30 September 2024".' } },
                        { name: 'text', type: 'text', required: true, maxLength: 200 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Vision, Mission and Values',
          fields: [
            {
              name: 'mission',
              label: false,
              type: 'group',
              fields: [
                description('Vision, Mission and Values'),
                { name: 'vision', type: 'textarea', required: true, maxLength: 600 },
                { name: 'mission', type: 'textarea', required: true, maxLength: 600 },
                {
                  name: 'values',
                  type: 'array',
                  minRows: 1,
                  maxRows: 10,
                  admin: { description: 'Each card shows the value’s first letter, so the letters spell PRIDE in this order.' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'name', type: 'text', required: true, maxLength: 40 },
                        { name: 'text', type: 'text', required: true, maxLength: 200 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Structure',
          fields: [
            {
              name: 'structure',
              label: false,
              type: 'group',
              fields: [
                description('OGSERC’s Structure'),
                paragraphs('introduction', 'Introduction'),
                {
                  name: 'organogramNote',
                  label: 'Organogram description',
                  type: 'textarea',
                  required: true,
                  maxLength: 600,
                  admin: { description: 'Read before the organogram; it describes the chart in words for anyone who cannot see it.' },
                },
                {
                  name: 'office',
                  label: 'Office beside the Chairman / CEO',
                  type: 'group',
                  fields: [{ name: 'name', type: 'text', required: true, maxLength: 100 }, units],
                },
                {
                  name: 'divisions',
                  type: 'array',
                  minRows: 1,
                  maxRows: 8,
                  admin: { description: 'The divisions under the Chairman / CEO, left to right.' },
                  fields: [{ name: 'name', type: 'text', required: true, maxLength: 100 }, units],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
