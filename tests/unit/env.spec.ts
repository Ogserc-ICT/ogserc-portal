import { expect, test } from '@playwright/test'

import { assertServerEnv, checkServerEnv } from '../../src/lib/env'
import { fakeDatabaseUrl, fakeSecret } from '../support/fakes'

// Placeholder values only, built at run time; none of these is a real secret.
const SECRET_32 = 'x'.repeat(32)
const valid = {
  DATABASE_URL: fakeDatabaseUrl('localhost:5432', 'db'),
  PAYLOAD_SECRET: SECRET_32,
  SITE_URL: 'https://example.org',
}

function errorsFor(env: Record<string, string | undefined>): string[] {
  return checkServerEnv(env).errors
}

test.describe('server startup checks', () => {
  test('a complete development configuration passes', () => {
    expect(errorsFor({ ...valid, NODE_ENV: 'development' })).toEqual([])
  })

  test('a complete production configuration passes', () => {
    expect(errorsFor({ ...valid, NODE_ENV: 'production' })).toEqual([])
  })

  test('DATABASE_URL and PAYLOAD_SECRET are required', () => {
    const errors = errorsFor({ NODE_ENV: 'development' })
    expect(errors).toContain('DATABASE_URL is required.')
    expect(errors).toContain('PAYLOAD_SECRET is required.')
  })

  test('PAYLOAD_SECRET must be at least 32 characters', () => {
    expect(errorsFor({ ...valid, PAYLOAD_SECRET: 'x'.repeat(31) })).toEqual([
      'PAYLOAD_SECRET must be at least 32 characters.',
    ])
  })

  test('SITE_URL is required in production', () => {
    expect(errorsFor({ ...valid, SITE_URL: undefined, NODE_ENV: 'production' })).toEqual([
      'SITE_URL is required in production.',
    ])
  })

  test('SITE_URL must be a full URL in production', () => {
    expect(errorsFor({ ...valid, SITE_URL: 'example.org', NODE_ENV: 'production' })).toHaveLength(1)
  })

  test('SITE_URL is optional in development', () => {
    expect(errorsFor({ ...valid, SITE_URL: undefined, NODE_ENV: 'development' })).toEqual([])
  })

  test('SITE_URL is not needed while `next build` runs', () => {
    const env = { ...valid, SITE_URL: undefined, NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }
    expect(errorsFor(env)).toEqual([])
  })

  test('test-only collections are refused in production', () => {
    expect(errorsFor({ ...valid, NODE_ENV: 'production', E2E_TEST_COLLECTIONS: 'true' })).toEqual([
      'E2E_TEST_COLLECTIONS must never be enabled in production.',
    ])
  })

  test('assertServerEnv throws without revealing the secret', () => {
    const shortSecret = fakeSecret(4) // under 32 characters
    expect(() => assertServerEnv({ ...valid, PAYLOAD_SECRET: shortSecret })).toThrow(
      /PAYLOAD_SECRET must be at least 32 characters/,
    )
    try {
      assertServerEnv({ ...valid, PAYLOAD_SECRET: shortSecret })
    } catch (error) {
      expect(String(error)).not.toContain(shortSecret)
    }
  })
})
