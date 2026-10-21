import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// The bundled common-passwords list must be exactly the file published by SecLists at the pinned
// commit, with its licence, and must reach the production build (data/common-passwords/SOURCE.md).

const DIR = 'data/common-passwords'
const LIST = `${DIR}/10k-most-common.txt`
const LICENSE = `${DIR}/LICENSE`

const LIST_SHA256 = '68782d6a4a19a4768d5f15dd66bd534e7a33055cc755411e33f16d18c50fdcce'
const LICENSE_SHA256 = '3dbdc93d5f8829de0941744841730a09c106d0732e5ae0e98ca1d77be7ded66c'

const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex')

test('the list and its licence are byte for byte the pinned SecLists files', () => {
  expect(sha256(LIST)).toBe(LIST_SHA256)
  expect(sha256(LICENSE)).toBe(LICENSE_SHA256)
  expect(readFileSync(LICENSE, 'utf8')).toMatch(/^MIT License/)
})

test('SOURCE.md records the same hashes', () => {
  const source = readFileSync(`${DIR}/SOURCE.md`, 'utf8')
  expect(source).toContain(LIST_SHA256)
  expect(source).toContain(LICENSE_SHA256)
})

test('10,001 distinct entries, one per line', () => {
  const entries = readFileSync(LIST, 'utf8').split(/\r?\n/).filter(Boolean)
  expect(entries).toHaveLength(10_001)
  expect(new Set(entries.map((entry) => entry.toLowerCase())).size).toBe(10_001)
})

// Read as text, not imported: importing next.config.ts runs Payload's withPayload, which patches
// console.warn and sets process variables, and in the full unit run it made the runner exit 0 silently
// with no tests run (seen 2026-10-21). The CI Docker job checks the built image itself.
test('the production build is told to carry the list and its licence', () => {
  const source = readFileSync('next.config.ts', 'utf8')
  const includes = /outputFileTracingIncludes:\s*\{\s*'\/\*':\s*\[([^\]]*)\]/.exec(source)?.[1]
  expect(includes, 'outputFileTracingIncludes for every route').toBeDefined()
  expect(includes).toContain(`'${LIST}'`)
  expect(includes).toContain(`'${LICENSE}'`)
})
