import type { ArrayField, DateField, Field, RelationshipField, TextField, UploadField } from 'payload'

// Small field builders shared by the content collections (Step 4), so the same field reads and
// behaves the same everywhere.

/** A calendar date without a time (publication dates, closing dates of comments). */
export const dayField = (name: string, options: Partial<Omit<DateField, 'type' | 'name'>> = {}): DateField => ({
  name,
  type: 'date',
  ...options,
  admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' }, ...options.admin },
})

/** A date and time (events, tender deadlines). */
export const dateTimeField = (name: string, options: Partial<Omit<DateField, 'type' | 'name'>> = {}): DateField => ({
  name,
  type: 'date',
  ...options,
  admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMMM yyyy, h:mm a' }, ...options.admin },
})

/** Downloadable files (PDF, Word, Excel) attached to an item. */
export const attachmentsField = (description = 'Files visitors can download with this item.'): UploadField => ({
  name: 'attachments',
  type: 'upload',
  relationTo: 'document-files',
  hasMany: true,
  admin: { description },
})

/** Regulatory documents this item refers to. */
export const relatedDocumentsField = (): RelationshipField => ({
  name: 'relatedDocuments',
  type: 'relationship',
  relationTo: 'documents',
  hasMany: true,
})

/** One line for cards, listings and search results. */
export const summaryField = (name = 'summary'): Field => ({
  name,
  type: 'textarea',
  required: true,
  maxLength: 400,
  admin: { description: 'One or two sentences for cards, listings and search results.' },
})

/** Why an address is not an acceptable https link, or true. Empty is fine (the field is optional). */
export function validateHttpsUrl(value: unknown): string | true {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string' || value.length > 500) return 'Enter a web address of 500 characters or fewer.'
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? true : 'Use an address starting with https://.'
  } catch {
    return 'Enter a full web address, starting with https://.'
  }
}

/** Why a link is neither a page of this site (starting with /) nor an https address, or true. */
export function validateSiteLink(value: unknown): string | true {
  if (typeof value !== 'string' || value === '') return 'Enter a page of this site (for example /about-ogserc) or an https:// address.'
  if (value.startsWith('/') && !value.startsWith('//')) {
    return /^\/[a-z0-9\-/#?=&]*$/.test(value) && value.length <= 200 ? true : 'Use only lowercase letters, numbers, hyphens and slashes.'
  }
  return validateHttpsUrl(value)
}

/** The same, but empty is allowed (an optional link). */
export const validateOptionalSiteLink = (value: unknown): string | true =>
  value === undefined || value === null || value === '' ? true : validateSiteLink(value)

/**
 * For homepage items that are only a pointer (for example "Order 002 is published"): the card links
 * here instead of to a page of its own, and the item needs no text (D-095).
 */
export const linkInsteadField = (): TextField => ({
  name: 'link',
  label: 'Link instead of a page of its own',
  type: 'text',
  validate: validateOptionalSiteLink,
  admin: {
    position: 'sidebar',
    description: 'Optional. A page of this site (for example /regulatory-instruments/forms) or an https:// address. The card then links there, and the text below can stay empty.',
  },
})

/** True if rich text has any words in it. */
export function hasRichText(value: unknown): boolean {
  const walk = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false
    const { text, children } = node as { text?: unknown; children?: unknown }
    if (typeof text === 'string' && text.trim() !== '') return true
    if ((node as { type?: unknown }).type === 'block') return true
    return Array.isArray(children) && children.some(walk)
  }
  return walk((value as { root?: unknown } | null | undefined)?.root)
}

/** Rich text required unless the item links elsewhere instead (linkInsteadField). */
export const requiredUnlessLink = (value: unknown, { siblingData }: { siblingData?: unknown }): string | true =>
  hasRichText(value) || Boolean((siblingData as { link?: unknown } | undefined)?.link) ? true : 'Write the text, or give a link instead.'

/** Links shown beside an item, for example "Read the Order" (D-095). */
export const relatedLinksField = (): ArrayField => ({
  name: 'relatedLinks',
  type: 'array',
  maxRows: 6,
  admin: { description: 'Optional buttons beside the item, for example "Read the Order".' },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'label', type: 'text', required: true, maxLength: 80 },
        { name: 'link', type: 'text', required: true, validate: validateSiteLink },
      ],
    },
  ],
})
