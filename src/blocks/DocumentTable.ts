import type { Block } from 'payload'

/**
 * A table inside a document's full text (D-102), such as a fee schedule: column headings, then
 * rows of cells, each cell plain text. Drawn as a table that scrolls sideways on phones.
 */
export const DocumentTableBlock: Block = {
  slug: 'documentTable',
  labels: { singular: 'Table', plural: 'Tables' },
  fields: [
    { name: 'caption', type: 'text', maxLength: 300, admin: { description: 'Optional: the table’s title, as in the document.' } },
    {
      name: 'columns',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      labels: { singular: 'Column heading', plural: 'Column headings' },
      fields: [{ name: 'heading', type: 'text', required: true, maxLength: 200 }],
    },
    {
      name: 'rows',
      type: 'array',
      minRows: 1,
      maxRows: 200,
      fields: [
        {
          name: 'cells',
          type: 'array',
          minRows: 1,
          maxRows: 12,
          admin: { description: 'One cell for each column, in order.' },
          fields: [{ name: 'text', type: 'textarea', maxLength: 2000 }],
        },
      ],
    },
  ],
}
