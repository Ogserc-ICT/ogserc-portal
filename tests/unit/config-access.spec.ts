import { expect, test } from '@playwright/test'
import { buildConfig, type SanitizedConfig } from 'payload'

import { allowAll, publishedOnly } from '../../src/access'
import { denyByDefault } from '../../src/access/deny-by-default'
import { MAX_DEPTH } from '../../src/lib/query-limits'
import configPromise from '../../src/payload.config'

// Audits the FINAL assembled Payload config (after every plugin and Payload's own additions):
// every access operation on every collection and global must be an explicit rule, never one of
// Payload's permissive defaults.

/** Every intentional use of allowAll, with the reason. Anything else fails the audit. */
const ALLOW_ALL_USES: Record<string, string> = {
  'media.read': 'Images are only ever used on public pages (see docs/DECISIONS.md for Step 4 drafts).',
}

let config: SanitizedConfig
let payloadDefaults: Set<unknown>

test.beforeAll(async () => {
  config = await configPromise
  // Payload's defaults are not exported, so build a throwaway config with no access rules and
  // collect the functions Payload fills in.
  const probe = await buildConfig({
    secret: 'x'.repeat(32),
    db: config.db,
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

test('every collection defines every access operation explicitly', () => {
  const problems: string[] = []
  for (const collection of config.collections) {
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
  for (const global of config.globals) {
    const access = global.access as Record<string, unknown>
    for (const op of operationsFor(global, true)) {
      const fn = access[op]
      if (typeof fn !== 'function') problems.push(`${global.slug}.${op} is missing`)
      else if (payloadDefaults.has(fn)) problems.push(`${global.slug}.${op} uses Payload's default`)
    }
  }
  expect(problems).toEqual([])
})

test('the probe really detects Payload defaults', () => {
  // Guards the audit itself: if this fails, the checks above would pass vacuously.
  expect(payloadDefaults.size).toBeGreaterThan(0)
})

test('allowAll is used only where listed, and only for reads', () => {
  const uses: string[] = []
  for (const entity of [...config.collections, ...config.globals]) {
    for (const [op, fn] of Object.entries(entity.access as Record<string, unknown>)) {
      if (fn === allowAll) uses.push(`${entity.slug}.${op}`)
    }
  }
  expect(uses.sort()).toEqual(Object.keys(ALLOW_ALL_USES).sort())
  for (const use of uses) expect(use.endsWith('.read')).toBe(true)
})

test('publishedOnly is used only on collections with drafts', () => {
  for (const collection of config.collections) {
    if (collection.access.read !== publishedOnly) continue
    const versions = collection.versions as { drafts?: unknown } | false
    expect(Boolean(versions && versions.drafts), `${collection.slug} uses publishedOnly without drafts`).toBe(true)
  }
})

test('denyByDefault runs after every other plugin', () => {
  const plugins = [...(config.plugins ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  expect(plugins.at(-1)).toBe(denyByDefault)
  expect(plugins.filter((plugin) => plugin.order === denyByDefault.order)).toHaveLength(1)
})

test('REST depth is capped', () => {
  expect(config.maxDepth).toBe(MAX_DEPTH)
})

test('API keys are off for staff accounts', () => {
  const users = config.collections.find((c) => c.slug === 'users')!
  expect(users.auth.useAPIKey).toBeFalsy()
})
