// Startup checks for server configuration. Pure, so the rules can be unit tested; messages name
// the variable but never include its value.

export type EnvCheck = { errors: string[]; warnings: string[] }

/** process.env, or any plain set of variables (tests). */
export type Env = Record<string, string | undefined>

const MIN_SECRET_LENGTH = 32

/** `next build` evaluates the config with NODE_ENV=production but without run-time values (D-009). */
function isBuildPhase(env: Env): boolean {
  return env.NEXT_PHASE === 'phase-production-build'
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
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
    if (!env.SITE_URL) errors.push('SITE_URL is required in production.')
    else if (!isValidUrl(env.SITE_URL)) errors.push('SITE_URL must be a full URL, e.g. https://example.org.')
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
