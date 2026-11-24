import type { Block } from 'payload'

/**
 * A short lead-in and a list of key points, each a term and its explanation, shown in a green box
 * inside a story (D-069's design for the NERC visit, D-095). A block inside the rich text, so staff
 * place it where it belongs in the story.
 */
export const HighlightsBlock: Block = {
  slug: 'highlights',
  labels: { singular: 'Key points box', plural: 'Key points boxes' },
  fields: [
    { name: 'intro', type: 'text', required: true, maxLength: 300 },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      fields: [
        { name: 'term', type: 'text', required: true, maxLength: 80 },
        { name: 'text', type: 'textarea', required: true, maxLength: 600 },
      ],
    },
  ],
}
