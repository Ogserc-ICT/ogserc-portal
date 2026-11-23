import { expect, test } from '@playwright/test'

import { slugField, slugify, validateSlug } from '../../src/fields/slug'

test('slugify makes clean lowercase addresses', () => {
  expect(slugify('Annual Report 2026')).toBe('annual-report-2026')
  expect(slugify('  Tariff Order: Q1/2026 (Revised)  ')).toBe('tariff-order-q1-2026-revised')
  expect(slugify('Ògùn State Électricity')).toBe('ogun-state-electricity')
  expect(slugify('Rules & Regulations')).toBe('rules-and-regulations')
  expect(slugify('---')).toBe('')
  expect(slugify('a'.repeat(130))).toHaveLength(120)
  expect(slugify(`${'a'.repeat(119)} b`)).toBe('a'.repeat(119))
})

test('validateSlug accepts only lowercase words joined by single hyphens', () => {
  expect(validateSlug('annual-report-2026')).toBe(true)
  for (const bad of ['', 'Annual', 'a--b', '-a', 'a-', 'a b', 'a/b', 'a'.repeat(121), 3, null]) {
    expect(validateSlug(bad), String(bad)).not.toBe(true)
  }
})

test('the field fills itself from the title and tidies a typed value', () => {
  const hook = slugField().hooks!.beforeValidate![0]!
  const run = (value: unknown, data: Record<string, unknown>) => hook({ value, data } as never)
  expect(run(undefined, { title: 'Public Notice No. 3' })).toBe('public-notice-no-3')
  expect(run('', { title: 'Public Notice' })).toBe('public-notice')
  expect(run('My Custom Address', { title: 'ignored' })).toBe('my-custom-address')
  expect(run(undefined, {})).toBeUndefined()
  expect(run(undefined, { title: '!!!' })).toBeUndefined()
})
