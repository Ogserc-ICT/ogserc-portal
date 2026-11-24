import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { allowAll, isPublisherOrAbove } from '../access'
import { PUBLIC_READ } from '../access/two-factor'
import { validateHttpsUrl, validateSiteLink } from '../fields/common'
import { changedFields, recordAudit, requestActor } from '../lib/audit/record'

// Site-wide settings (FR-CMS-01, D-093): the text and links that appear on many pages, so staff can
// change them without a developer: contact details, office hours, departments, social links, the
// footer summary and the homepage hero slides (FR-WEB-08). Public to read (they are on every page);
// publishers and administrators change them, and each change is in the audit log. Build step 4
// slice 5 makes the homepage, footer and contact page read them, replacing placeholder-content.ts.

/** Why a map address is not Google Maps' embed address, or true (the CSP allows only that, D-058). */
export function validateMapEmbed(value: unknown): string | true {
  if (value === undefined || value === null || value === '') return true
  return typeof value === 'string' && value.startsWith('https://www.google.com/maps/embed?') && value.length <= 1000
    ? true
    : 'Paste the address from Google Maps’ “Embed a map” code, starting with https://www.google.com/maps/embed?'
}

const SOCIAL_NETWORKS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
]

const SETTINGS_FIELDS = ['contact', 'officeHours', 'departments', 'socialLinks', 'footerSummary', 'heroSlides']

const auditSettings: GlobalAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const fields = changedFields(SETTINGS_FIELDS, previousDoc, doc)
  if (fields.length > 0) {
    await recordAudit(req, { action: 'settings.updated', actor: requestActor(req), target: { type: 'site-settings', id: 'site-settings', label: 'Site settings' }, details: { fields } })
  }
  return doc
}

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { description: 'Contact details, office hours, social links, the footer text and the homepage slides. Changes show on the site straight away.' },
  custom: PUBLIC_READ,
  access: {
    read: allowAll,
    update: isPublisherOrAbove,
  },
  versions: { max: 50 },
  hooks: { afterChange: [auditSettings] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contact',
          fields: [
            {
              name: 'contact',
              type: 'group',
              fields: [
                {
                  name: 'introduction',
                  type: 'textarea',
                  maxLength: 400,
                  admin: { description: 'The contact page’s opening sentence.' },
                },
                {
                  name: 'addressLines',
                  type: 'array',
                  minRows: 1,
                  maxRows: 6,
                  fields: [{ name: 'line', type: 'text', required: true, maxLength: 120 }],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'phone', type: 'text', required: true, maxLength: 40 },
                    { name: 'email', type: 'email', required: true },
                  ],
                },
                { name: 'mapPlace', label: 'Map description', type: 'text', maxLength: 120, admin: { description: 'Read to screen readers, for example "OGSERC head office, OPIC Towers, Abeokuta".' } },
                { name: 'mapLink', label: 'Google Maps link', type: 'text', validate: validateHttpsUrl },
                { name: 'mapEmbed', label: 'Google Maps embed address', type: 'text', validate: validateMapEmbed },
              ],
            },
            {
              name: 'officeHours',
              type: 'array',
              maxRows: 7,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'days', type: 'text', required: true, maxLength: 80 },
                    { name: 'hours', type: 'text', required: true, maxLength: 80 },
                  ],
                },
              ],
            },
            {
              name: 'departments',
              type: 'array',
              maxRows: 20,
              admin: { description: 'The contact page’s list (FR-CNT-01).' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, maxLength: 80 },
                    { name: 'email', type: 'email', required: true },
                  ],
                },
                { name: 'description', type: 'text', maxLength: 200 },
              ],
            },
          ],
        },
        {
          label: 'Footer and social',
          fields: [
            { name: 'footerSummary', type: 'textarea', maxLength: 300 },
            {
              name: 'socialLinks',
              type: 'array',
              maxRows: 10,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'network', type: 'select', required: true, options: SOCIAL_NETWORKS },
                    { name: 'url', type: 'text', required: true, validate: validateHttpsUrl },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Homepage slides',
          fields: [
            {
              name: 'heroSlides',
              type: 'array',
              maxRows: 6,
              admin: {
                description:
                  'The homepage slideshow (FR-WEB-08). Each slide: a photograph OGSERC has the right to publish, a headline and one button. Text sits on a dark overlay, so any photograph keeps it readable.',
              },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'headline', type: 'text', required: true, maxLength: 90 },
                { name: 'text', type: 'textarea', maxLength: 200 },
                {
                  type: 'row',
                  fields: [
                    { name: 'actionLabel', label: 'Button text', type: 'text', required: true, maxLength: 40 },
                    {
                      name: 'actionContext',
                      label: 'Button text for screen readers (added after it)',
                      type: 'text',
                      maxLength: 60,
                      admin: { description: 'Optional, for example "about OGSERC" after "Learn more".' },
                    },
                    { name: 'actionLink', label: 'Button link', type: 'text', required: true, validate: validateSiteLink },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
