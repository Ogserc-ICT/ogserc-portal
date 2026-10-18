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

test.beforeAll(async () => {
  configs.deployed = await configPromise
  configs['with test collections'] = await portalConfig({ withTestCollections: true })
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
          if (fn === allowAll) uses.push(`${entity.slug}.${op}`)
        }
      }
      expect(uses.sort()).toEqual(Object.keys(ALLOW_ALL_USES).sort())
      for (const use of uses) expect(use.endsWith('.read')).toBe(true)
    })

    test('publishedOnly is used only on collections with drafts', () => {
      for (const collection of configs[name].collections) {
        if (collection.access.read !== publishedOnly) continue
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

    test('denyByDefault runs after every other plugin', () => {
      const plugins = [...(configs[name].plugins ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      expect(plugins.at(-1)).toBe(denyByDefault)
      expect(plugins.filter((plugin) => plugin.order === denyByDefault.order)).toHaveLength(1)
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
