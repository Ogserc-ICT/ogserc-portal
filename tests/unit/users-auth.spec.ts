import { expect, test } from '@playwright/test'
import type { SanitizedConfig } from 'payload'

import { isAdminNotSelf } from '../../src/access'
import { passwordPolicyOnSave, refuseBulkPasswordChange } from '../../src/lib/auth/enforce-password-policy'
import { genericLoginError } from '../../src/lib/auth/generic-login-error'
import { protectLastAdministrator } from '../../src/lib/auth/last-administrator'
import { publicErrorReply, refuseForgotPassword } from '../../src/lib/auth/no-forgot-password'
import { countFailedLogins, limitAuthRequests, rateLimitReply } from '../../src/lib/auth/rate-limit'
import { auditFailedLogin, noteLockBeforeLogin } from '../../src/lib/audit/hooks'
import { endSessionsOnRoleChange } from '../../src/lib/auth/revoke-sessions'
import { limitSessionAge } from '../../src/lib/auth/session-cap'
import { siteOrigin } from '../../src/lib/env'
import configPromise, { portalConfig } from '../../src/payload.config'

// Pins the staff sign-in settings in the FINAL assembled config, deployed and with the test-only
// collections, so a plugin or a later edit cannot quietly change them (Step 3 plan, D-052).
// The database tests check the same settings from outside (tests/e2e-db/users.spec.ts).

const configs: Record<string, SanitizedConfig> = {}

test.beforeAll(async () => {
  configs.deployed = await configPromise
  configs['with test collections'] = await portalConfig({ withTestCollections: true })
})

/** The rule as written: two-factor sign-in wraps every access rule (D-084), so compare unwrapped. */
let unwrapped: SanitizedConfig
test.beforeAll(async () => {
  unwrapped = await portalConfig({ withTestCollections: false, twoFactorSignIn: false })
})

for (const variant of ['deployed', 'with test collections']) {
  test(`staff sign-in settings (${variant})`, () => {
    const users = configs[variant]!.collections.find((collection) => String(collection.slug) === 'users')
    expect(users, 'users collection').toBeDefined()
    const auth = users!.auth
    expect(auth.tokenExpiration).toBe(3600)
    expect(auth.useAPIKey).toBe(false)
    expect(auth.removeTokenFromResponses).toBe(true)
    expect(auth.useSessions).toBe(true)
    expect(auth.cookies.sameSite).toBe('Strict')
    expect(auth.maxLoginAttempts).toBe(5)
    expect(auth.lockTime).toBe(15 * 60 * 1000)
    expect(users!.hooks.afterError).toContain(genericLoginError)
    expect(users!.hooks.beforeOperation).toContain(limitSessionAge)
    expect(users!.hooks.beforeOperation).toContain(protectLastAdministrator)
    expect(users!.hooks.afterChange).toContain(endSessionsOnRoleChange)
    const asWritten = unwrapped.collections.find((collection) => String(collection.slug) === 'users')!
    expect(asWritten.access.delete).toBe(isAdminNotSelf)
    expect(users!.access.delete, 'wrapped by two-factor sign-in').not.toBe(isAdminNotSelf)
    expect(users!.hooks.beforeDelete.length).toBeGreaterThan(0)
  })

  // Every password Payload sets passes through these hooks (D-053). GraphQL would be another way in.
  test(`password policy hooks, and no GraphQL (${variant})`, () => {
    const config = configs[variant]!
    const users = config.collections.find((collection) => String(collection.slug) === 'users')!
    expect(users.hooks.beforeValidate[0]).toBe(passwordPolicyOnSave)
    expect(users.hooks.beforeOperation[3]).toBe(refuseBulkPasswordChange)
    expect(config.graphQL.disable).toBe(true)
  })

  // Rate limits run before any other work, and the failure count before the reply is replaced (D-081).
  test(`rate limit hooks come first (${variant})`, () => {
    const users = configs[variant]!.collections.find((collection) => String(collection.slug) === 'users')!
    // The forgotten-password refusal (no email, D-085) first, then the rate limits.
    expect(users.hooks.beforeOperation[0]).toBe(refuseForgotPassword)
    expect(users.hooks.beforeOperation[1]).toBe(limitAuthRequests)
    expect(users.hooks.beforeOperation[2]).toBe(noteLockBeforeLogin)
    // Count and audit the failure, then write the 429 body, then the generic 401 body (D-081, D-083).
    expect(users.hooks.afterError).toEqual([countFailedLogins, auditFailedLogin, rateLimitReply, publicErrorReply, genericLoginError])
  })

  test(`serverURL and every CSRF origin are the normalised site origin (${variant})`, () => {
    const config = configs[variant]!
    const origin = siteOrigin(process.env)
    // Payload appends serverURL to the list itself, so it may appear twice; never in another form.
    if (origin) {
      expect(config.serverURL).toBe(origin)
      expect(config.csrf.length).toBeGreaterThan(0)
      for (const entry of config.csrf) expect(entry).toBe(origin)
    } else {
      expect(config.csrf.filter(Boolean)).toEqual([])
    }
  })
}

test('delete access: administrators, never their own account', async () => {
  const requestAs = (user: Record<string, unknown> | null) => ({ req: { user } }) as unknown as Parameters<typeof isAdminNotSelf>[0]
  const admin = { collection: 'users', id: 7, roles: ['administrator'] }
  expect(await isAdminNotSelf(requestAs(admin))).toEqual({ id: { not_equals: 7 } })
  expect(await isAdminNotSelf(requestAs({ ...admin, roles: ['publisher', 'editor'] }))).toBe(false)
  expect(await isAdminNotSelf(requestAs(null))).toBe(false)
})
