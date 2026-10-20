import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { verifyConfirmation } from '../../scripts/db-verify'
import { READ_ONLY_OPTION, readOnlyConnectionString } from '../../src/lib/db/read-only'
import { fakeDatabaseUrl } from '../support/fakes'

// pg reads the URL's query parameters with URLSearchParams, as here, and sends `options` to the
// server when the session starts.
const options = (url: string) => new URL(url).searchParams.get('options')

test.describe('read-only connection string', () => {
  test('adds the read-only option', () => {
    const url = fakeDatabaseUrl('ep-dev.example.neon.tech', 'neondb', '?sslmode=require')
    const readOnly = readOnlyConnectionString(url)
    expect(options(readOnly)).toBe(READ_ONLY_OPTION)
    expect(READ_ONLY_OPTION).toBe('-c default_transaction_read_only=on')
  })

  test('keeps any options already given', () => {
    const url = fakeDatabaseUrl('ep-dev.example.neon.tech', 'neondb', '?options=endpoint%3Dep-dev&sslmode=require')
    expect(options(readOnlyConnectionString(url))).toBe(`endpoint=ep-dev ${READ_ONLY_OPTION}`)
  })

  test('changes nothing else', () => {
    const url = fakeDatabaseUrl('ep-dev.example.neon.tech:5432', 'neondb', '?sslmode=verify-full&application_name=x')
    const [before, after] = [new URL(url), new URL(readOnlyConnectionString(url))]
    for (const part of ['protocol', 'username', 'password', 'host', 'pathname'] as const) {
      expect(after[part], part).toBe(before[part])
    }
    expect(after.searchParams.get('sslmode')).toBe('verify-full')
    expect(after.searchParams.get('application_name')).toBe('x')
  })
})

test.describe('db:verify confirmation', () => {
  let dir: string
  test.beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'ogserc-db-verify-test-'))
  })
  test.afterAll(() => rmSync(dir, { recursive: true, force: true }))

  const since = new Date('2026-10-19T10:00:00.000Z')
  const write = (name: string, content: unknown) => {
    const file = path.join(dir, name)
    writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
    return file
  }
  const complete = { host: 'localhost:5432', database: 'ogserc', tables: 12, migrations: 3, at: '2026-10-19T10:00:05.000Z' }

  test('is accepted when complete and written after the check started', () => {
    expect(verifyConfirmation(write('ok.json', complete), since)).toBe(
      'host localhost:5432, database ogserc: 12 tables and 3 migrations present',
    )
  })

  test('is missing when the check wrote nothing (the silent exit-code-0 case)', () => {
    expect(verifyConfirmation(path.join(dir, 'absent.json'), since)).toBeNull()
  })

  test('is rejected when stale, incomplete or unreadable', () => {
    expect(verifyConfirmation(write('stale.json', { ...complete, at: '2026-10-19T09:59:59.000Z' }), since)).toBeNull()
    expect(verifyConfirmation(write('no-at.json', { ...complete, at: 'yesterday' }), since)).toBeNull()
    expect(verifyConfirmation(write('no-counts.json', { ...complete, tables: '12' }), since)).toBeNull()
    expect(verifyConfirmation(write('no-host.json', { ...complete, host: undefined }), since)).toBeNull()
    expect(verifyConfirmation(write('broken.json', '{"host":'), since)).toBeNull()
  })
})
