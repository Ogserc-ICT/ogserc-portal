import { expect, test } from '@playwright/test'

import { headingId, outlineOf } from '../../src/lib/cms/outline'
import { blocks } from '../../src/migrations/data/consumer-complaint-2026-11'

// The "On this page" list (D-101): ids from heading words, and only top-level h2 headings.

const text = (value: string, format = 0) => ({ type: 'text', text: value, format })
const heading = (tag: string, ...children: object[]) => ({ type: 'heading', tag, children })

test('a heading id is its words, lowercase and joined by hyphens', () => {
  expect(headingId('How to complain')).toBe('how-to-complain')
  expect(headingId('Frequently asked questions?')).toBe('frequently-asked-questions')
  expect(headingId("OGSERC's  Fees & charges")).toBe('ogserc-s-fees-charges')
  expect(headingId('  ')).toBe('')
})

test('the outline lists top-level h2 headings in order, joining bold and plain runs', () => {
  const data = {
    root: {
      children: [
        heading('h2', text('Your '), text('rights', 1)),
        { type: 'paragraph', children: [text('Not a heading')] },
        heading('h3', text('A subheading')),
        heading('h2', text('How to complain')),
        heading('h2', text(' ')),
      ],
    },
  }
  expect(outlineOf(data)).toEqual([
    { id: 'your-rights', text: 'Your rights' },
    { id: 'how-to-complain', text: 'How to complain' },
  ])
})

test('empty or missing rich text has no outline', () => {
  expect(outlineOf(null)).toEqual([])
  expect(outlineOf({})).toEqual([])
  expect(outlineOf({ root: { children: [] } })).toEqual([])
})

test('the Consumer Complaint text has unique section ids, and only one "OGSERC to supply" gap', () => {
  const ids = blocks.flatMap((block) => ('h2' in block ? [headingId(block.h2)] : []))
  expect(new Set(ids).size).toBe(ids.length)
  const gaps = JSON.stringify(blocks).match(/\[OGSERC to supply:/g) ?? []
  expect(gaps).toHaveLength(1)
})
