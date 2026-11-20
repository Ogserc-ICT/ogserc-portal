import { expect, test } from '@playwright/test'

import { assertServerEnv, checkServerEnv, csrfOrigins, siteOrigin } from '../../src/lib/env'
import { fakeDatabaseUrl, fakeSecret } from '../support/fakes'

// Placeholder values only, built at run time; none of these is a real secret.
const SECRET_32 = 'x'.repeat(32)
const valid = {
  DATABASE_URL: fakeDatabaseUrl('localhost:5432', 'db'),
  PAYLOAD_SECRET: SECRET_32,
  SITE_URL: 'https://example.org',
  CLIENT_IP_HEADER: 'X-Forwarded-For',
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

  test('production needs CLIENT_IP_HEADER, development and the build do not', () => {
    const missing = 'CLIENT_IP_HEADER is required in production (for example X-Forwarded-For behind Caddy).'
    for (const value of [undefined, '', '  ']) {
      expect(errorsFor({ ...valid, CLIENT_IP_HEADER: value, NODE_ENV: 'production' }), String(value)).toEqual([missing])
    }
    expect(errorsFor({ ...valid, CLIENT_IP_HEADER: undefined, NODE_ENV: 'development' })).toEqual([])
    const build = { ...valid, CLIENT_IP_HEADER: undefined, NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }
    expect(errorsFor(build)).toEqual([])
  })

  test('turning the breach check off in production warns but does not stop the server', () => {
    const warns = (env: Record<string, string | undefined>) => checkServerEnv({ ...valid, ...env }).warnings
    const production = checkServerEnv({ ...valid, NODE_ENV: 'production', PASSWORD_BREACH_CHECK: 'off' })
    expect(production.errors).toEqual([])
    expect(production.warnings).toEqual([expect.stringContaining('PASSWORD_BREACH_CHECK=off')])
    expect(warns({ NODE_ENV: 'development', PASSWORD_BREACH_CHECK: 'off' })).toEqual([])
    expect(warns({ NODE_ENV: 'production' })).toEqual([])
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

  test('SITE_URL must use https in production', () => {
    const httpsError = 'SITE_URL must use https in production (http is allowed only for localhost).'
    for (const SITE_URL of ['http://example.org', 'http://192.168.1.10:3000', 'ftp://example.org']) {
      expect(errorsFor({ ...valid, SITE_URL, NODE_ENV: 'production' }), SITE_URL).toEqual([httpsError])
    }
    // CI and the Docker check run the production build on this machine over plain http.
    for (const SITE_URL of ['http://localhost:3000', 'http://127.0.0.1:3100', 'http://[::1]:3000', 'https://example.org/']) {
      expect(errorsFor({ ...valid, SITE_URL, NODE_ENV: 'production' }), SITE_URL).toEqual([])
    }
    // Development and `next build` are not affected.
    expect(errorsFor({ ...valid, SITE_URL: 'http://example.org', NODE_ENV: 'development' })).toEqual([])
    const build = { ...valid, SITE_URL: 'http://example.org', NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }
    expect(errorsFor(build)).toEqual([])
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

test.describe('site origin (serverURL and the CSRF list)', () => {
  // Browsers send the bare origin in the Origin header, and Payload compares it as a string, so
  // any other form of SITE_URL would refuse every cookie-authenticated request.
  test('a trailing slash, a path, a query or a fragment is removed', () => {
    for (const SITE_URL of [
      'https://example.org',
      'https://example.org/',
      'https://example.org/admin/',
      'https://example.org/a/b?x=1#top',
      'HTTPS://Example.ORG/',
    ]) {
      expect(siteOrigin({ SITE_URL }), SITE_URL).toBe('https://example.org')
      expect(csrfOrigins({ SITE_URL }), SITE_URL).toEqual(['https://example.org'])
    }
  })

  test('a port is kept and a default port is dropped', () => {
    expect(siteOrigin({ SITE_URL: 'http://localhost:3100/' })).toBe('http://localhost:3100')
    expect(siteOrigin({ SITE_URL: 'https://example.org:443/' })).toBe('https://example.org')
  })

  test('no SITE_URL, or one that is not an http(s) URL, gives no origin and an empty list', () => {
    for (const SITE_URL of [undefined, '', 'example.org', 'ftp://example.org', 'javascript:alert(1)']) {
      expect(siteOrigin({ SITE_URL }), String(SITE_URL)).toBeUndefined()
      expect(csrfOrigins({ SITE_URL }), String(SITE_URL)).toEqual([])
    }
  })
})
