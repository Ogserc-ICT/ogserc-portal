import { expect, test } from '@playwright/test'

import { assertWipeableTestDatabase, checkTestDatabase, databaseIdentity } from '../support/test-db'

const DEV = 'postgres://dev:secret-dev@ep-dev.example.neon.tech/neondb?sslmode=verify-full'
const TEST = 'postgres://e2e:secret-e2e@ep-test.example.neon.tech/ogserc_e2e?sslmode=verify-full'

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
    expect(() => assertWipeableTestDatabase({ TEST_DATABASE_URL: 'postgres://u:p@host/' })).toThrow(/not a valid/)
  })

  test('refuses a database name without "e2e" or "test"', () => {
    const url = 'postgres://u:p@ep-test.example.neon.tech/ogserc_staging'
    expect(() => assertWipeableTestDatabase({ DATABASE_URL: DEV, TEST_DATABASE_URL: url })).toThrow(/must contain/)
  })

  test('refuses the same host and database as DATABASE_URL, even with other credentials', () => {
    const same = 'postgres://other:pw@EP-TEST.example.neon.tech/ogserc_e2e'
    expect(() => assertWipeableTestDatabase({ DATABASE_URL: TEST, TEST_DATABASE_URL: same })).toThrow(/same host and database/)
  })

  test('the same database name on another host is allowed (Neon branches)', () => {
    const otherHost = 'postgres://u:p@ep-other.example.neon.tech/ogserc_e2e'
    expect(checkTestDatabase({ DATABASE_URL: TEST, TEST_DATABASE_URL: otherHost }).errors).toEqual([])
  })

  test('messages never include the user, password or query string', () => {
    try {
      assertWipeableTestDatabase({ NODE_ENV: 'production', DATABASE_URL: DEV, TEST_DATABASE_URL: TEST })
      throw new Error('expected a refusal')
    } catch (error) {
      const message = (error as Error).message
      for (const secret of ['secret-e2e', 'secret-dev', 'e2e:', 'sslmode']) expect(message).not.toContain(secret)
      expect(message).toContain('host ep-test.example.neon.tech, database ogserc_e2e')
    }
  })

  test('identity is host and database only', () => {
    expect(databaseIdentity(TEST)).toEqual({ host: 'ep-test.example.neon.tech', database: 'ogserc_e2e' })
    expect(databaseIdentity('postgres://u:p@localhost:5432/ogserc_e2e')).toEqual({ host: 'localhost:5432', database: 'ogserc_e2e' })
  })
})
