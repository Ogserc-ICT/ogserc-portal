import type { Block } from 'payload'

/** Who signed a document, at the end of its full text (D-102): names and roles, never signatures. */
export const SignatoriesBlock: Block = {
  slug: 'signatories',
  labels: { singular: 'Signatories', plural: 'Signatories' },
  fields: [
    {
      name: 'people',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      fields: [
        { name: 'name', type: 'text', required: true, maxLength: 120 },
        { name: 'role', type: 'text', required: true, maxLength: 120 },
        { name: 'organisation', type: 'text', maxLength: 200 },
      ],
    },
  ],
}
