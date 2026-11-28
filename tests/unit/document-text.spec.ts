import { expect, test } from '@playwright/test'

import { documentBlocks } from '../../src/lib/documents/rich-text'
import type { DocumentBlock } from '../../src/lib/documents/types'
import { richText } from '../../src/migrations/20261128_154400_documents'
import { documents } from '../../src/migrations/data/documents-2026-11'
import type { DocumentBlock as FrozenBlock } from '../../src/migrations/data/documents-2026-11/types'

// D-102: the documents migration puts each Order's text into rich text, and the page reads it back
// as blocks. Nothing may be lost or changed on the way: every word, heading, indent, bold lead,
// italic note, table cell and signatory comes back as it was in code.

const LEAD = /^(WHEREAS:|NOW THEREFORE|MADE)/

/** The block the page should draw for a frozen block (the bold lead is now the words themselves). */
function expected(block: FrozenBlock): DocumentBlock {
  if (block.type !== 'paragraph') return block
  const { strongLead, ...rest } = block
  const lead = strongLead ? LEAD.exec(block.text)?.[0] : undefined
  return { ...rest, ...(lead && lead !== block.text ? { lead } : {}) }
}

const words = (blocks: readonly unknown[]) => JSON.stringify(blocks).match(/[\p{L}\p{N}]+/gu) ?? []

for (const doc of documents.filter((d) => d.text)) {
  test(`${doc.reference}: the full text comes back from the CMS unchanged`, () => {
    const back = documentBlocks(richText(doc.text!))
    expect(back).toEqual(doc.text!.map(expected))
  })

  test(`${doc.reference}: the same words, in the same order`, () => {
    const back = documentBlocks(richText(doc.text!)) ?? []
    const plain = (blocks: readonly (FrozenBlock | DocumentBlock)[]) =>
      words(blocks.map((b) => (b.type === 'paragraph' ? b.text : b.type === 'heading' ? b.text : b)))
    expect(plain(back)).toEqual(plain(doc.text!))
  })
}

test('empty or missing rich text has no full text', () => {
  expect(documentBlocks(null)).toBeUndefined()
  expect(documentBlocks({ root: { children: [] } })).toBeUndefined()
  expect(documentBlocks({ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: '  ' }] }] } })).toBeUndefined()
})

test('text written by staff keeps bold opening words and indents, and drops link formatting', () => {
  const data = {
    root: {
      children: [
        {
          type: 'paragraph',
          indent: 1,
          children: [
            { type: 'text', text: 'Note:', format: 1 },
            { type: 'text', text: ' see ' },
            { type: 'link', children: [{ type: 'text', text: 'the Order' }] },
            { type: 'text', text: '.' },
          ],
        },
      ],
    },
  }
  expect(documentBlocks(data)).toEqual([{ type: 'paragraph', text: 'Note: see the Order.', indent: true, lead: 'Note:' }])
})
