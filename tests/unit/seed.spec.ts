import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { parseSeedArgs, readSeedConfirmation } from '../../scripts/seed'
import { DOCUMENT_CATEGORIES } from '../../src/collections/Documents'
import {
  SAMPLE_MARK,
  samplePdf,
  samplePng,
  sampleItems,
  SEEDED_COLLECTIONS,
  seedRefusal,
} from '../../src/lib/seed/sample-content'
import { detectDocumentType } from '../../src/lib/uploads/document-signature'
import { detectImageType } from '../../src/lib/uploads/image-signature'

// `pnpm seed` (FR-CMS-08, D-094): clearly marked samples only, for databases nobody works in.

const items = sampleItems({ file: 1, images: [2, 3, 4] })

test('the command needs the database name it shows, and nothing else', () => {
  expect(parseSeedArgs(['--show-target'])).toEqual({ showTarget: true })
  expect(parseSeedArgs(['--database', 'neondb'])).toEqual({ database: 'neondb' })
  expect(parseSeedArgs(['--', '--database', 'review_db'])).toEqual({ database: 'review_db' })
  for (const args of [[], ['neondb'], ['--database'], ['--database', 'a', 'b'], ['--database', 'db; rm -rf /']]) {
    expect(parseSeedArgs(args), args.join(' ')).toHaveProperty('error')
  }
})

test('a run counts only with a fresh, complete confirmation', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'seed-test-'))
  const file = path.join(dir, 'confirm.json')
  const since = new Date()
  writeFileSync(file, JSON.stringify({ host: 'h', database: 'd', created: 40, skipped: 0, at: new Date().toISOString() }))
  expect(readSeedConfirmation(file, since)).toBe('host h, database d: 40 sample items added, 0 already there')
  writeFileSync(file, JSON.stringify({ host: 'h', database: 'd', created: 40, skipped: 0, at: '2000-01-01T00:00:00Z' }))
  expect(readSeedConfirmation(file, since)).toBeNull()
  writeFileSync(file, JSON.stringify({ host: 'h', database: 'd', at: new Date().toISOString() }))
  expect(readSeedConfirmation(file, since)).toBeNull()
  expect(readSeedConfirmation(path.join(dir, 'missing.json'), since)).toBeNull()
})

test('it refuses any database in which staff have worked on content', () => {
  expect(seedRefusal(0)).toBeNull()
  expect(seedRefusal(1)).toContain('Nothing was changed')
  expect(seedRefusal(12)).toContain('12 audit log entries')
})

test('every sample is marked and says OGSERC is to supply it', () => {
  for (const collection of SEEDED_COLLECTIONS) {
    for (const item of items[collection]!) {
      expect(item.title.startsWith(SAMPLE_MARK), item.title).toBe(true)
      expect(item.title, item.title).toContain('OGSERC to supply]')
    }
  }
})

test('every content collection gets published samples and one draft that must never show', () => {
  for (const collection of SEEDED_COLLECTIONS) {
    const statuses = items[collection]!.map((item) => item._status)
    expect(statuses.filter((status) => status === 'draft'), collection).toHaveLength(1)
    expect(statuses.filter((status) => status === 'published').length, collection).toBeGreaterThan(0)
    const draft = items[collection]!.find((item) => item._status === 'draft')!
    expect(draft.title, collection).toContain('must never show on the site')
  }
})

test('there is a published document in every Regulatory Instruments category, one of them superseded', () => {
  const published = items.documents!.filter((doc) => doc._status === 'published')
  expect(published.map((doc) => doc.category).sort()).toEqual(DOCUMENT_CATEGORIES.map(({ value }) => value).sort())
  expect(published.some((doc) => doc.documentStatus === 'superseded')).toBe(true)
})

test('the sample file and images pass the same checks as staff uploads', () => {
  const pdf = samplePdf('[Sample document file, OGSERC to supply]')
  expect(detectDocumentType(pdf)).toEqual({ type: 'application/pdf' })
  // What Payload's own PDF check looks for (payload/dist/utilities/validatePDF.js, not exported).
  const end = pdf.subarray(-1024).toString('latin1')
  expect(end).toContain('%%EOF')
  expect(end).toContain('xref')
  expect(detectImageType(samplePng([0x1d, 0x9d, 0x62]))).toBe('image/png')
})
