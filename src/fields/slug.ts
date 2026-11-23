import type { TextField } from 'payload'

// The last part of an item's web address, for example `annual-report-2026` (CLAUDE.md: clean,
// lowercase URLs). Staff may type one; left empty, it is made from the title when the item is saved.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SLUG_LENGTH = 120

/** Lowercase words and digits joined by single hyphens; accents dropped, everything else removed. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '')
}

/** Why a slug is not acceptable, or true. */
export function validateSlug(value: unknown): string | true {
  if (typeof value !== 'string' || value === '') return 'Give the item a web address, or a title to make one from.'
  if (value.length > MAX_SLUG_LENGTH) return `The web address must be ${MAX_SLUG_LENGTH} characters or fewer.`
  if (!SLUG_PATTERN.test(value)) return 'Use only lowercase letters, numbers and single hyphens, for example annual-report-2026.'
  return true
}

/** A unique `slug` field, filled from `fromField` (default `title`) when left empty. */
export function slugField(fromField = 'title'): TextField {
  return {
    name: 'slug',
    label: 'Web address',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    validate: validateSlug,
    admin: {
      position: 'sidebar',
      description: 'The end of the page address. Left empty, it is made from the title. Changing it breaks old links.',
    },
    hooks: {
      beforeValidate: [
        ({ value, data }) => {
          if (typeof value === 'string' && value.trim() !== '') return slugify(value)
          const source = (data as Record<string, unknown> | undefined)?.[fromField]
          return typeof source === 'string' ? slugify(source) || undefined : value
        },
      ],
    },
  }
}
