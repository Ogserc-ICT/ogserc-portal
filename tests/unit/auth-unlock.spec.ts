import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { parseUnlockArgs, readUnlockConfirmation } from '../../scripts/auth-unlock'

// `pnpm auth:unlock <email>` (docs/RUNBOOK.md Section 4.1). The database test runs it for real
// against the test database (tests/e2e-db/users.spec.ts, "failed sign-ins and lockout").

test.describe('arguments', () => {
  test('one plain email address, lower-cased', () => {
    expect(parseUnlockArgs(['Someone.Name+x@Example.ORG'])).toEqual({ email: 'someone.name+x@example.org' })
    expect(parseUnlockArgs(['--', 'a@b.example'])).toEqual({ email: 'a@b.example' })
  })

  test('--show-target needs no email', () => {
    expect(parseUnlockArgs(['--show-target'])).toEqual({ showTarget: true })
  })

  test('no email, two emails, or anything that is not a plain address is refused', () => {
    for (const args of [
      [],
      ['a@b.example', 'c@d.example'],
      ['not-an-email'],
      ['a@localhost'],
      ['a b@c.example'],
      ['a@b.example; rm -rf /'],
      ['"a"@b.example'],
      ['$(whoami)@b.example'],
      [`${'a'.repeat(250)}@b.example`],
    ]) {
      expect('error' in parseUnlockArgs(args), JSON.stringify(args)).toBe(true)
    }
  })
})

test.describe('confirmation', () => {
  let dir: string
  const since = new Date('2026-10-20T10:00:00.000Z')
  const complete = { host: 'db.example', database: 'ogserc', unlocked: true, wasLocked: true, at: '2026-10-20T10:00:01.000Z' }

  test.beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'ogserc-unlock-'))
  })
  test.afterAll(() => rmSync(dir, { recursive: true, force: true }))

  function write(name: string, value: unknown): string {
    const file = path.join(dir, name)
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value))
    return file
  }

  test('a fresh, complete file confirms the unlock and names only the host and database', () => {
    const summary = readUnlockConfirmation(write('ok.json', complete), since)
    expect(summary).toContain('db.example')
    expect(summary).toContain('ogserc')
    expect(summary).toContain('it was locked')
  })

  test('anything stale, missing or incomplete does not confirm it', () => {
    expect(readUnlockConfirmation(path.join(dir, 'absent.json'), since)).toBeNull()
    expect(readUnlockConfirmation(write('stale.json', { ...complete, at: '2026-10-20T09:59:59.000Z' }), since)).toBeNull()
    expect(readUnlockConfirmation(write('not-unlocked.json', { ...complete, unlocked: false }), since)).toBeNull()
    expect(readUnlockConfirmation(write('no-was.json', { ...complete, wasLocked: undefined }), since)).toBeNull()
    expect(readUnlockConfirmation(write('no-host.json', { ...complete, host: undefined }), since)).toBeNull()
    // The database-check confirmation is not an unlock confirmation.
    const verify = { host: 'db.example', database: 'ogserc', tables: 10, migrations: 3, at: complete.at }
    expect(readUnlockConfirmation(write('verify.json', verify), since)).toBeNull()
    expect(readUnlockConfirmation(write('broken.json', '{"host":'), since)).toBeNull()
  })
})
