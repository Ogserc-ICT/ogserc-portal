import { expect, test } from '@playwright/test'
import { buildConfig, type SanitizedConfig } from 'payload'

import { allowAll, canSaveContent, publishedOnly } from '../../src/access'
import { denyByDefault } from '../../src/access/deny-by-default'
import { guardPublishedContent } from '../../src/access/guard-published-content'
import { testCollectionsEnabled } from '../../src/collections/test'
import { MAX_DEPTH } from '../../src/lib/query-limits'
import configPromise, { portalConfig } from '../../src/payload.config'

// Audits the FINAL assembled Payload config (after every plugin and Payload's own additions):
// every access operation on every collection and global must be an explicit rule, never one of
// Payload's permissive defaults. Run on the config as deployed and on the config with the
// test-only collections (src/collections/test), so those follow the same rules.

/** Every intentional use of allowAll, with the reason. Anything else fails the audit. */
const ALLOW_ALL_USES: Record<string, string> = {
  'media.read': 'Images are only ever used on public pages (see docs/DECISIONS.md for Step 4 drafts).',
}

const TEST_ONLY_SLUGS = ['e2e-drafts']

const configs: Record<'deployed' | 'with test collections', SanitizedConfig> = {} as never
let payloadDefaults: Set<unknown>

const slugsOf = (config: SanitizedConfig): string[] => config.collections.map((c) => String(c.slug))

/** A rule wrapped by publicOrTwoFactor, unwrapped; anything else as it is. */
const asWritten = (fn: unknown): unknown => (fn as { inner?: unknown } | undefined)?.inner ?? fn

/** The deployed config, with two-factor sign-in wrapping every rule (D-084). */
let live: SanitizedConfig

test.beforeAll(async () => {
  // The rules as written: the identity checks below compare them with the helpers in src/access.
  configs.deployed = await portalConfig({ withTestCollections: false, twoFactorSignIn: false })
  configs['with test collections'] = await portalConfig({ withTestCollections: true, twoFactorSignIn: false })
  live = await configPromise
  // Payload's defaults are not exported, so build a throwaway config with no access rules and
  // collect the functions Payload fills in.
  const probe = await buildConfig({
    secret: 'x'.repeat(32),
    db: configs.deployed.db,
    collections: [{ slug: 'probe', fields: [] }],
  })
  const probeAccess = probe.collections.find((c) => String(c.slug) === 'probe')!.access
  payloadDefaults = new Set(Object.values(probeAccess))
})

function operationsFor(entity: { auth?: unknown; versions?: unknown }, isGlobal: boolean): string[] {
  const ops = isGlobal ? ['read', 'update'] : ['create', 'read', 'update', 'delete']
  if (!isGlobal && entity.auth) ops.push('admin', 'unlock')
  if (entity.versions) ops.push('readVersions')
  return ops
}

test.describe('test-only collections', () => {
  test('are enabled only by the exact value "true"', () => {
    expect(testCollectionsEnabled({ E2E_TEST_COLLECTIONS: 'true' })).toBe(true)
    for (const value of [undefined, '', 'false', 'TRUE', '1', 'yes', ' true']) {
      expect(testCollectionsEnabled({ E2E_TEST_COLLECTIONS: value }), String(value)).toBe(false)
    }
  })

  test('are not registered when the flag is off', async () => {
    expect(process.env.E2E_TEST_COLLECTIONS, 'unit tests must run without the flag').toBeUndefined()
    const off = await portalConfig({ withTestCollections: false })
    for (const slug of TEST_ONLY_SLUGS) {
      expect(slugsOf(configs.deployed)).not.toContain(slug)
      expect(slugsOf(off)).not.toContain(slug)
    }
  })

  test('are registered when the flag is on', () => {
    for (const slug of TEST_ONLY_SLUGS) expect(slugsOf(configs['with test collections'])).toContain(slug)
  })

  test('never rewrite the committed types', () => {
    expect(configs['with test collections'].typescript.autoGenerate).toBe(false)
    expect(configs.deployed.typescript.autoGenerate).not.toBe(false)
  })

  test('include a collection using canSaveContent, so the guard rule below is not vacuous', () => {
    const users = configs['with test collections'].collections.filter(
      (c) => (c.access as Record<string, unknown>).update === canSaveContent,
    )
    expect(users.length).toBeGreaterThan(0)
  })
})

for (const name of ['deployed', 'with test collections'] as const) {
  test.describe(`config ${name}`, () => {
    test('every collection defines every access operation explicitly', () => {
      const problems: string[] = []
      for (const collection of configs[name].collections) {
        const access = collection.access as Record<string, unknown>
        for (const op of operationsFor(collection, false)) {
          const fn = access[op]
          if (typeof fn !== 'function') problems.push(`${collection.slug}.${op} is missing`)
          else if (payloadDefaults.has(fn)) problems.push(`${collection.slug}.${op} uses Payload's default`)
        }
      }
      expect(problems).toEqual([])
    })

    test('every global defines every access operation explicitly', () => {
      const problems: string[] = []
      for (const global of configs[name].globals) {
        const access = global.access as Record<string, unknown>
        for (const op of operationsFor(global, true)) {
          const fn = access[op]
          if (typeof fn !== 'function') problems.push(`${global.slug}.${op} is missing`)
          else if (payloadDefaults.has(fn)) problems.push(`${global.slug}.${op} uses Payload's default`)
        }
      }
      expect(problems).toEqual([])
    })

    test('allowAll is used only where listed, and only for reads', () => {
      const uses: string[] = []
      for (const entity of [...configs[name].collections, ...configs[name].globals]) {
        for (const [op, fn] of Object.entries(entity.access as Record<string, unknown>)) {
          if (asWritten(fn) === allowAll) uses.push(`${entity.slug}.${op}`)
        }
      }
      expect(uses.sort()).toEqual(Object.keys(ALLOW_ALL_USES).sort())
      for (const use of uses) expect(use.endsWith('.read')).toBe(true)
    })

    test('publishedOnly is used only on collections with drafts', () => {
      for (const collection of configs[name].collections) {
        if (asWritten(collection.access.read) !== publishedOnly) continue
        const versions = collection.versions as { drafts?: unknown } | false
        expect(Boolean(versions && versions.drafts), `${collection.slug} uses publishedOnly without drafts`).toBe(true)
      }
    })

    test('every collection using canSaveContent also has guardPublishedContent', () => {
      // canSaveContent alone lets editors change or unpublish published documents (D-049).
      for (const collection of configs[name].collections) {
        const access = collection.access as Record<string, unknown>
        if (access.create !== canSaveContent && access.update !== canSaveContent) continue
        expect(collection.hooks?.beforeOperation ?? [], String(collection.slug)).toContain(guardPublishedContent)
      }
    })

    test('denyByDefault runs after every other plugin except two-factor sign-in, which runs last', () => {
      const plugins = [...(configs[name].plugins ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      expect(plugins.at(-2)).toBe(denyByDefault)
      expect(plugins.at(-1)!.order).toBe(Number.MAX_SAFE_INTEGER)
      expect(plugins.filter((plugin) => plugin.order === denyByDefault.order)).toHaveLength(1)
      expect(plugins.filter((plugin) => plugin.order === Number.MAX_SAFE_INTEGER)).toHaveLength(1)
    })
  })
}

test('the probe really detects Payload defaults', () => {
  // Guards the audit itself: if this fails, the checks above would pass vacuously.
  expect(payloadDefaults.size).toBeGreaterThan(0)
})

test('REST depth is capped', () => {
  expect(configs.deployed.maxDepth).toBe(MAX_DEPTH)
})

test('API keys are off for staff accounts', () => {
  const users = configs.deployed.collections.find((c) => c.slug === 'users')!
  expect(users.auth.useAPIKey).toBeFalsy()
})

// --- Two-factor sign-in (D-084) ----------------------------------------------------------------
// Behaviour, not identity: on the live config every rule is wrapped, so call each one as a staff
// session that has not entered this session's code and check that it gets nothing. Payload's own
// collections are wrapped by the plugin when Payload starts (onInit), which needs a database, so
// they are covered by the database tests instead.
test.describe('two-factor sign-in', () => {
  type Session = { hasTotp: boolean; _strategy: string }
  const administrator = (session: Session) => ({ id: 1, collection: 'users', email: 'a@example.org', roles: ['administrator'], ...session })
  let liveWithTests: SanitizedConfig
  test.beforeAll(async () => {
    liveWithTests = await portalConfig({ withTestCollections: true })
  })

  /** "slug.operation" for every rule that does not refuse this user outright. */
  async function allowed(config: SanitizedConfig, user: unknown): Promise<string[]> {
    const open: string[] = []
    for (const collection of config.collections.filter((c) => !String(c.slug).startsWith('payload-'))) {
      for (const [op, fn] of Object.entries(collection.access as Record<string, unknown>)) {
        if (typeof fn !== 'function') continue
        const result = await (fn as (args: unknown) => unknown)({ req: { user, payload: { config } }, id: undefined, data: undefined })
        if (result !== false) open.push(`${collection.slug}.${op}`)
      }
    }
    return open.sort()
  }

  // users.admin (may this user open the admin panel) is not wrapped, and must not be: a session
  // that owes a code has to reach the panel to enter it, and the plugin's screens send it to the
  // code page. Everything the panel shows or changes is behind the wrapped rules.
  test('an administrator who has set it up but not entered a code gets only public reads', async () => {
    const user = administrator({ hasTotp: true, _strategy: 'local-jwt' })
    expect(await allowed(live, user)).toEqual(['media.read', 'users.admin'])
    expect(await allowed(liveWithTests, user)).toEqual(['media.read', 'users.admin'])
  })

  test('an administrator who has never set it up can read only their own account, to set it up', async () => {
    const user = administrator({ hasTotp: false, _strategy: 'local-jwt' })
    expect(await allowed(live, user)).toEqual(['media.read', 'users.admin', 'users.read'])
    const users = live.collections.find((c) => c.slug === 'users')!
    const result = await (users.access.read as (args: unknown) => unknown)({ req: { user, payload: { config: live } } })
    expect(JSON.stringify(result)).toContain('"equals":1')
  })

  test('a verified administrator gets the rules as written', async () => {
    const user = administrator({ hasTotp: true, _strategy: 'totp' })
    expect(await allowed(live, user)).toEqual(expect.arrayContaining(['users.read', 'users.create', 'media.create', 'audit-log.read']))
  })

  test('visitors who are not signed in still read public images and published test documents', async () => {
    const open = await allowed(liveWithTests, null)
    expect(open).toEqual(['e2e-drafts.read', 'media.read'])
  })
})
