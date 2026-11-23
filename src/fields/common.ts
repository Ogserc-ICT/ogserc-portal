import type { DateField, Field, RelationshipField, UploadField } from 'payload'

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
