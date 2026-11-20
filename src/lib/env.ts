// Startup checks for server configuration. Pure, so the rules can be unit tested; messages name
// the variable but never include its value.

import { s3Settings } from './uploads/s3-settings'

export type EnvCheck = { errors: string[]; warnings: string[] }

/** process.env, or any plain set of variables (tests). */
export type Env = Record<string, string | undefined>

const MIN_SECRET_LENGTH = 32

/** `next build` evaluates the config with NODE_ENV=production but without run-time values (D-009). */
function isBuildPhase(env: Env): boolean {
  return env.NEXT_PHASE === 'phase-production-build'
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value)
  } catch {
    return undefined
  }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * The site's origin ("https://example.org") from SITE_URL, without any path, query or trailing
 * slash. Browsers send exactly this in the Origin header, which Payload compares as a string for
 * its CSRF check, so a SITE_URL of "https://example.org/" must not end up there as written.
 * The site is always served at the root (no basePath), so the origin is the site's address.
 * Undefined if SITE_URL is missing or not an http(s) URL.
 */
export function siteOrigin(env: Env): string | undefined {
  const url = env.SITE_URL ? parseUrl(env.SITE_URL) : undefined
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return undefined
  return url.origin
}

/** Payload's `csrf` list: the site's origin only, or empty (no check) when SITE_URL is unset. */
export function csrfOrigins(env: Env): string[] {
  const origin = siteOrigin(env)
  return origin ? [origin] : []
}

export function checkServerEnv(env: Env): EnvCheck {
  const errors: string[] = []
  const warnings: string[] = []
  const production = env.NODE_ENV === 'production'

  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required.')

  if (!env.PAYLOAD_SECRET) {
    errors.push('PAYLOAD_SECRET is required.')
  } else if (env.PAYLOAD_SECRET.length < MIN_SECRET_LENGTH) {
    errors.push(`PAYLOAD_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`)
  }

  if (production && !isBuildPhase(env)) {
    const url = env.SITE_URL ? parseUrl(env.SITE_URL) : undefined
    if (!env.SITE_URL) errors.push('SITE_URL is required in production.')
    else if (!url) errors.push('SITE_URL must be a full URL, e.g. https://example.org.')
    // Session cookies are Secure in production, and staff passwords must never cross the network
    // unencrypted. Plain http is allowed only on this machine (CI and the Docker check use it).
    else if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
      errors.push('SITE_URL must use https in production (http is allowed only for localhost).')
    }
  }

  // Uploads (D-086): all five S3 settings or none; and in production none only with an explicit
  // MEDIA_STORAGE=local, because files on the container's disk are lost at every deploy.
  const storage = s3Settings(env)
  if (storage && 'missing' in storage) errors.push(`S3 storage is half configured: set ${storage.missing.join(', ')} too, or none of them.`)
  if (production && !isBuildPhase(env) && !storage && env.MEDIA_STORAGE !== 'local') {
    errors.push('Uploads need S3 storage in production (the S3_* settings), or MEDIA_STORAGE=local where losing them at each deploy is acceptable (CI only).')
  }

  // Without it every visitor shares one sign-in limit, so one person could block everyone (D-081).
  if (production && !isBuildPhase(env) && !env.CLIENT_IP_HEADER?.trim()) {
    errors.push('CLIENT_IP_HEADER is required in production (for example X-Forwarded-For behind Caddy).')
  }

  if (env.PASSWORD_BREACH_CHECK === 'off' && production && !isBuildPhase(env)) {
    warnings.push('PASSWORD_BREACH_CHECK=off: staff passwords are not checked against known data breaches (D-053).')
  }

  if (env.E2E_TEST_COLLECTIONS === 'true' && production) {
    errors.push('E2E_TEST_COLLECTIONS must never be enabled in production.')
  }

  return { errors, warnings }
}

/** Throws (stopping the server) if the configuration is unsafe; logs warnings otherwise. */
export function assertServerEnv(env: Env): void {
  const { errors, warnings } = checkServerEnv(env)
  for (const warning of warnings) console.warn(`[config] ${warning}`)
  if (errors.length > 0) {
    throw new Error(`Refusing to start, unsafe configuration:\n- ${errors.join('\n- ')}`)
  }
}
