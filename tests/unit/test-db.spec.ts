import { expect, test } from '@playwright/test'

import { fakeDatabaseUrl } from '../support/fakes'
import { databaseIdentity } from '../../src/lib/db/identity'
import { assertWipeableTestDatabase, checkTestDatabase } from '../support/test-db'

// Fake URLs with random passwords, built at run time (tests/support/fakes.ts).
const DEV = fakeDatabaseUrl('ep-dev.example.neon.tech', 'neondb', '?sslmode=verify-full')
const TEST = fakeDatabaseUrl('ep-test.example.neon.tech', 'ogserc_e2e', '?sslmode=verify-full')

test.describe('test database guard', () => {
  test('accepts a separate database whose name marks it as a test database', () => {
    expect(checkTestDatabase({ DATABASE_URL: DEV, TEST_DATABASE_URL: TEST }).errors).toEqual([])
    expect(assertWipeableTestDatabase({ DATABASE_URL: DEV, TEST_DATABASE_URL: TEST })).toEqual({
      host: 'ep-test.example.neon.tech',
      database: 'ogserc_e2e',
    })
  })

  test('refuses in production', () => {
    expect(() => assertWipeableTestDatabase({ NODE_ENV: 'production', DATABASE_URL: DEV, TEST_DATABASE_URL: TEST })).toThrow(
      /NODE_ENV is production/,
    )
  })

  test('refuses without TEST_DATABASE_URL, or with one it cannot read', () => {
    expect(() => assertWipeableTestDatabase({ DATABASE_URL: DEV })).toThrow(/not set/)
    expect(() => assertWipeableTestDatabase({ TEST_DATABASE_URL: 'not a url' })).toThrow(/not a valid/)
    expect(() => assertWipeableTestDatabase({ TEST_DATABASE_URL: fakeDatabaseUrl('host', '') })).toThrow(/not a valid/)
  })

  test('refuses a database name without "e2e" or "test"', () => {
    const url = fakeDatabaseUrl('ep-test.example.neon.tech', 'ogserc_staging')
    expect(() => assertWipeableTestDatabase({ DATABASE_URL: DEV, TEST_DATABASE_URL: url })).toThrow(/must contain/)
  })

  test('refuses the same host and database as DATABASE_URL, even with other credentials', () => {
    const same = fakeDatabaseUrl('EP-TEST.example.neon.tech', 'ogserc_e2e') // another random password
    expect(() => assertWipeableTestDatabase({ DATABASE_URL: TEST, TEST_DATABASE_URL: same })).toThrow(/same host and database/)
  })

  test('the same database name on another host is allowed (Neon branches)', () => {
    const otherHost = fakeDatabaseUrl('ep-other.example.neon.tech', 'ogserc_e2e')
    expect(checkTestDatabase({ DATABASE_URL: TEST, TEST_DATABASE_URL: otherHost }).errors).toEqual([])
  })

  test('messages never include the user, password or query string', () => {
    try {
      assertWipeableTestDatabase({ NODE_ENV: 'production', DATABASE_URL: DEV, TEST_DATABASE_URL: TEST })
      throw new Error('expected a refusal')
    } catch (error) {
      const message = (error as Error).message
      const [testUrl, devUrl] = [new URL(TEST), new URL(DEV)]
      for (const secret of [testUrl.password, devUrl.password, `${testUrl.username}:`, 'sslmode']) {
        expect(message).not.toContain(secret)
      }
      expect(message).toContain('host ep-test.example.neon.tech, database ogserc_e2e')
    }
  })

  test('identity is host and database only', () => {
    expect(databaseIdentity(TEST)).toEqual({ host: 'ep-test.example.neon.tech', database: 'ogserc_e2e' })
    expect(databaseIdentity(fakeDatabaseUrl('localhost:5432', 'ogserc_e2e'))).toEqual({ host: 'localhost:5432', database: 'ogserc_e2e' })
  })
})
