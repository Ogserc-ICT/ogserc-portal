import { expect, test } from '@playwright/test'
import type { SanitizedConfig } from 'payload'

import { genericLoginError } from '../../src/lib/auth/generic-login-error'
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
