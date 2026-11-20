import { expect, test } from '@playwright/test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { parseResetArgs, readResetConfirmation } from '../../scripts/auth-reset-2fa'

// The argument handling and confirmation reading of `pnpm auth:reset-2fa` (D-084). The database
// tests run it against the test database (tests/e2e-db/two-factor-reset.spec.ts).

const dir = mkdtempSync(path.join(os.tmpdir(), 'reset-2fa-'))
const file = (content: unknown) => {
  const name = path.join(dir, `${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(name, typeof content === 'string' ? content : JSON.stringify(content))
  return name
}
const since = new Date('2026-11-20T10:00:00Z')
const valid = { host: 'db.example', database: 'ogserc_e2e', reset: true, hadTwoFactor: true, at: '2026-11-20T10:00:05Z' }

test('arguments: one plain email, lower-cased, or --show-target; anything else is refused', () => {
  expect(parseResetArgs([' Kemi.Bello@Example.org '])).toEqual({ email: 'kemi.bello@example.org' })
  expect(parseResetArgs(['--show-target'])).toEqual({ showTarget: true })
  expect(parseResetArgs([])).toEqual({ error: 'Pass exactly one email address: pnpm auth:reset-2fa someone@example.org' })
  for (const args of [['a@example.org', 'b@example.org'], ['not-an-email'], ['a@b'], ['$(rm -rf)@example.org']]) {
    expect('error' in parseResetArgs(args), args.join(' ')).toBe(true)
  }
})

test('a complete, fresh confirmation names the database and what happened', () => {
  expect(readResetConfirmation(file(valid), since)).toBe(
    'host db.example, database ogserc_e2e: two-factor sign-in reset (it had two-factor sign-in; signed out everywhere)',
  )
  expect(readResetConfirmation(file({ ...valid, hadTwoFactor: false }), since)).toContain('it had not set it up')
})

test('a stale, incomplete or unreadable confirmation counts as no confirmation', () => {
  expect(readResetConfirmation(file({ ...valid, at: '2026-11-20T09:59:59Z' }), since)).toBeNull()
  for (const missing of ['host', 'database', 'reset', 'hadTwoFactor', 'at']) {
    const { [missing]: _dropped, ...rest } = valid as Record<string, unknown>
    expect(readResetConfirmation(file(rest), since), missing).toBeNull()
  }
  expect(readResetConfirmation(file({ ...valid, reset: false }), since)).toBeNull()
  expect(readResetConfirmation(file('not json'), since)).toBeNull()
  expect(readResetConfirmation(path.join(dir, 'missing.json'), since)).toBeNull()
})
