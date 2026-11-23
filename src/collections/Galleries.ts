import type { CollectionConfig } from 'payload'

import { dayField, summaryField } from '../fields/common'
import { slugField } from '../fields/slug'
import { contentCollection } from './content/content-collection'

/** Video sites a gallery may embed. Embeds load only when asked for (D-058) and the CSP lists them (step 12). */
export const VIDEO_HOSTS = ['www.youtube.com', 'youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'] as const

/** Why an address is not a YouTube or Vimeo https link, or true. */
export function validateVideoUrl(value: unknown): string | true {
  if (typeof value !== 'string' || value === '') return 'Paste the video’s YouTube or Vimeo address.'
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !(VIDEO_HOSTS as readonly string[]).includes(url.hostname)) {
      return 'Only YouTube and Vimeo videos can be shown, with an address starting with https://.'
    }
    return value.length <= 300 ? true : 'The address is too long.'
  } catch {
    return 'Paste the video’s full YouTube or Vimeo address.'
  }
}

// Photo and video galleries (FR-NEWS-04, SRS Section 4 Media Center "Photos & Videos", D-093).
// Photos are uploaded to Media; videos are embedded from YouTube or Vimeo, never uploaded.
export const Galleries: CollectionConfig = contentCollection({
  slug: 'galleries',
  labels: { singular: 'Gallery', plural: 'Photos & videos' },
  defaultSort: '-date',
  admin: {
    defaultColumns: ['title', 'date', '_status'],
    listSearchableFields: ['title', 'summary'],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    slugField(),
    dayField('date', { required: true, index: true }),
    summaryField(),
    {
      name: 'photos',
      type: 'array',
      maxRows: 100,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'caption', type: 'text', maxLength: 200, admin: { description: 'Optional. The image’s description for screen readers is set in Media.' } },
      ],
    },
    {
      name: 'videos',
      type: 'array',
      maxRows: 20,
      fields: [
        { name: 'url', label: 'YouTube or Vimeo address', type: 'text', required: true, validate: validateVideoUrl },
        { name: 'title', type: 'text', required: true, maxLength: 200, admin: { description: 'Read out to screen readers and shown before the video loads.' } },
      ],
    },
  ],
})
