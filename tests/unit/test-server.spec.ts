import { rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { fakeDatabaseUrl, fakeJwt, fakeSecret } from '../support/fakes'
import { redact, resetConfirmation, secretValues } from '../support/test-server'

// The database test server wrapper: the reset must confirm itself, because `payload run` can exit
// with code 0 without running it (D-047); and the log file must never contain secrets.

test.describe('reset confirmation', () => {
  const file = path.join(os.tmpdir(), `ogserc-unit-reset-confirm-${process.pid}.json`)
  test.afterEach(() => rmSync(file, { force: true }))

  test('is accepted only with a host, a database and no users', () => {
    writeFileSync(file, JSON.stringify({ host: 'ep-test.example', database: 'ogserc_e2e', users: 0, at: 'now' }))
    expect(resetConfirmation(file)).toBe('host ep-test.example, database ogserc_e2e, no users')
  })

  test('is missing when the reset wrote nothing (the silent exit-code-0 case)', () => {
    rmSync(file, { force: true })
    expect(resetConfirmation(file)).toBeNull()
  })

  test('is rejected when incomplete, unreadable or reporting users', () => {
    for (const content of ['{', '{}', JSON.stringify({ host: 'h', database: 'd', users: 1 }), JSON.stringify({ host: 'h', users: 0 })]) {
      writeFileSync(file, content)
      expect(resetConfirmation(file)).toBeNull()
    }
  })
})

// The database test server's log file must never contain secrets or database URLs.

// All fake, built at run time (tests/support/fakes.ts).
const DEV_URL = fakeDatabaseUrl('ep-dev.example.neon.tech', 'neondb', '?sslmode=verify-full')
const ENV = {
  DATABASE_URL: DEV_URL,
  TEST_DATABASE_URL: fakeDatabaseUrl('ep-test.example.neon.tech', 'ogserc_e2e'),
  PROTECTED_DATABASE_URL: DEV_URL,
  PAYLOAD_SECRET: fakeSecret(24),
  S3_SECRET_ACCESS_KEY: fakeSecret(),
  SITE_URL: 'http://localhost:3100',
  PORT: '3100',
  SHORT_TOKEN: 'abc',
}

test('collects the values of secret-named variables only', () => {
  const values = secretValues(ENV)
  expect(values).toContain(ENV.DATABASE_URL)
  expect(values).toContain(ENV.TEST_DATABASE_URL)
  expect(values).toContain(ENV.PAYLOAD_SECRET)
  expect(values).toContain(ENV.S3_SECRET_ACCESS_KEY)
  expect(values).not.toContain(ENV.SITE_URL)
  expect(values).not.toContain('abc') // too short to be a secret; redacting it would mangle the log
})

test('removes environment secrets wherever they appear', () => {
  const secrets = secretValues(ENV)
  const line = `connecting with ${ENV.TEST_DATABASE_URL} secret=${ENV.PAYLOAD_SECRET} key ${ENV.S3_SECRET_ACCESS_KEY}`
  const out = redact(line, secrets)
  expect(out).not.toContain(new URL(ENV.TEST_DATABASE_URL).password)
  expect(out).not.toContain(ENV.PAYLOAD_SECRET)
  expect(out).not.toContain(ENV.S3_SECRET_ACCESS_KEY)
})

test('removes any database connection string, even one not in the environment', () => {
  const url = fakeDatabaseUrl('other-host:5432', 'db').replace('postgres:', 'postgresql:')
  expect(redact(`Error: connect to ${url} failed`, [])).toBe('Error: connect to postgres://[redacted] failed')
})

test('removes JWTs, reset links, tokens in URLs and password fields', () => {
  expect(redact(`Authorization: JWT ${fakeJwt()}`, [])).toBe('Authorization: JWT [redacted-jwt]')
  expect(redact(`Reset: http://localhost:3100/admin/reset/${fakeSecret(8)}`, [])).toBe(
    'Reset: http://localhost:3100/admin/reset/[redacted]',
  )
  expect(redact(`GET /api/verify?token=${fakeSecret(6)}&next=/admin`, [])).toBe(
    'GET /api/verify?token=[redacted]&next=/admin',
  )
  const body = JSON.stringify({ email: 'a@test.invalid', password: fakeSecret() })
  expect(redact(body, [])).toBe('{"email":"a@test.invalid","password":"[redacted]"}')
})

test('leaves ordinary log lines alone', () => {
  const line = '[WebServer]  POST /api/media 400 in 464ms (next.js: 2ms, application-code: 462ms)'
  expect(redact(line, secretValues(ENV))).toBe(line)
})
