import { type APIRequestContext, expect, test } from '@playwright/test'

import type { ScenarioResult } from '../support/drafts-scenario'
import { createStaff, loadAdminAccount, newAccount, signIn, signInToken } from './support/auth'
import { runTestDbScript } from './support/db-script'
import { oncePerRun } from './support/run-cache'

// Content save rules (FR-CMS-06, SRS Section 10): editors save drafts only; only publishers and
// administrators change what the public sees. Enforced by canSaveContent and guardPublishedContent
// (D-049), tested on the test-only `e2e-drafts` collection (D-050) through the Local API and through
// Payload's REST pipeline, in a `payload run` script, because the test server never registers test
// collections (CI's is the production build, which refuses the flag). The script records what
// happened; the expectations are here.
//
// Not serial: every case is reported even when one fails. The scenario runs once per test run
// (oncePerRun), so a worker restarted after a failure reuses its result instead of running it again.

let baseURL: string
let admin: APIRequestContext
let result: ScenarioResult

test.beforeAll(async ({ baseURL: url }) => {
  test.setTimeout(120_000) // includes a `payload run` against the test database
  baseURL = url!
  admin = await signIn(baseURL, await loadAdminAccount())
  result = await oncePerRun('drafts', async () => {
    const editor = await createStaff(admin, 'drafts-editor', ['editor'])
    const publisher = await createStaff(admin, 'drafts-publisher', ['publisher'])
    const tokens = { editor: await signInToken(baseURL, editor), publisher: await signInToken(baseURL, publisher) }
    return (await runTestDbScript('tests/support/drafts-scenario.ts', [editor.email, publisher.email], {
      E2E_TEST_COLLECTIONS: 'true',
      E2E_DRAFTS_TOKENS: JSON.stringify(tokens),
    })) as ScenarioResult
  })
})

test.afterAll(async () => {
  await admin?.dispose()
})

/**
 * What each case must do. `public`: the title the public sees for each of the case's documents
 * (seeded first, then any it created), or null when not visible. `stored`: titles as stored.
 */
type Expected = { outcome?: 'allowed' | 'refused'; public: (string | null)[]; stored?: string[] }

const EXPECTED: Record<string, Expected> = {
  // Creating
  'editor creates a draft': { outcome: 'allowed', public: [null] },
  'editor creates without _status': { outcome: 'allowed', public: [null] },
  'editor creates as published': { outcome: 'refused', public: [] },
  'editor creates as published with draft: true': { outcome: 'refused', public: [] },
  // Changing a published document
  'editor updates a published document without _status': { outcome: 'refused', public: ['original'] },
  'editor saves a draft of a published document': { outcome: 'allowed', public: ['original'] },
  'editor unpublishes a published document': { outcome: 'refused', public: ['original'] },
  'editor deletes a published document': { outcome: 'refused', public: ['original'] },
  'editor saves with draft as the string "true"': { outcome: 'refused', public: ['original'] },
  'editor saves a draft with no data': { outcome: 'refused', public: ['original'] },
  'editor saves a draft with an unexpected _status': { outcome: 'refused', public: ['original'] },
  // Publishing a draft
  'editor publishes a draft': { outcome: 'refused', public: [null] },
  'editor publishes a draft with draft: true': { outcome: 'refused', public: [null] },
  'editor updates a draft without _status': { outcome: 'allowed', public: [null], stored: ['draft-changed-by-editor'] },
  // Bulk updates
  'editor bulk-updates a published and a draft document': {
    outcome: 'refused',
    public: ['original', null],
    stored: ['original', 'original-draft'],
  },
  'editor bulk-updates two drafts': { outcome: 'allowed', public: [null, null], stored: ['bulk-drafts', 'bulk-drafts'] },
  // Versions
  'editor restores a draft version over a published document': { outcome: 'refused', public: ['original'] },
  'editor restores a draft version, asking the Local API for a draft': { outcome: 'refused', public: ['original'] },
  'editor restores an older published version': { outcome: 'refused', public: ['second'] },
  'publisher restores an older published version': { outcome: 'allowed', public: ['original'] },
  // Duplicating
  'editor duplicates a published document': { outcome: 'refused', public: ['original'] },
  'editor duplicates a published document as a draft': { outcome: 'allowed', public: ['original', null] },
  'publisher duplicates a published document': { outcome: 'allowed', public: ['original', 'duplicated-by-publisher'] },
  // Publishers, and trusted server code
  'publisher publishes a draft': { outcome: 'allowed', public: ['published-by-publisher'] },
  'publisher unpublishes a published document': { outcome: 'allowed', public: [null] },
  'trusted code changes a published document': { outcome: 'allowed', public: ['trusted-change'] },
  // REST
  'REST: editor updates a published document without _status': { outcome: 'refused', public: ['original'] },
  'REST: editor saves a draft of a published document': { outcome: 'allowed', public: ['original'] },
  'REST: editor unpublishes a published document': { outcome: 'refused', public: ['original'] },
  'REST: editor bulk-updates a published and a draft document': {
    outcome: 'refused',
    public: ['original', null],
    stored: ['original', 'original-draft'],
  },
  'REST: editor restores a draft version over a published document': { outcome: 'refused', public: ['original'] },
  'REST: editor restores a draft version as a draft': { outcome: 'allowed', public: ['original'] },
  'REST: editor duplicates a published document (a draft by default)': {
    outcome: 'allowed',
    public: ['original', null],
    stored: ['original', 'rest-duplicated-by-editor'],
  },
  'REST: editor duplicates a published document with draft=false': { outcome: 'refused', public: ['original'] },
  'REST: editor sends overrideAccess in the query, a header and the body': { outcome: 'refused', public: ['original'] },
}

test('every scenario case has an expectation, and every expectation a case', () => {
  expect(Object.keys(result.cases).sort()).toEqual(Object.keys(EXPECTED).sort())
})

for (const [name, expected] of Object.entries(EXPECTED)) {
  test(name, () => {
    const found = result.cases[name]
    expect(found, `the scenario did not run "${name}"`).toBeDefined()
    console.log(`[drafts] ${name}: ${JSON.stringify(found)}`)
    if (expected.outcome === 'allowed') expect(found!.error).toBeNull()
    if (expected.outcome === 'refused') expect(found!.error).not.toBeNull()
    expect(found!.docs.map((doc) => (doc?.public ? (doc.public.title ?? '') : null))).toEqual(expected.public)
    if (expected.stored) expect(found!.docs.map((doc) => doc?.title)).toEqual(expected.stored)
  })
}

test('every case used its own documents', () => {
  expect(result.sharedIds).toEqual([])
})

test.describe('the public', () => {
  test('lists only published documents', () => {
    expect(result.publicList.length).toBeGreaterThan(0)
    expect(result.publicList.every((status) => status === 'published'), result.publicList.join(', ')).toBe(true)
  })

  test('cannot read versions', () => {
    expect(result.publicVersions).not.toBeNull()
  })

  test('sees no drafts through REST, even sending overrideAccess and draft', () => {
    expect(result.anonymousRestDrafts ?? 0).toBe(0)
  })
})

test.describe('REST on the running server ignores overrideAccess from the request', () => {
  test('an editor cannot change another account by sending it', async () => {
    const editor = await signIn(baseURL, await createStaff(admin, 'override-editor', ['editor']))
    const target = newAccount('override-target')
    const created = await admin.post('/api/users', { data: { ...target, roles: ['editor'] } })
    expect(created.status()).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number | string; name: string } }
    try {
      const response = await editor.patch(`/api/users/${doc.id}?overrideAccess=true&depth=0`, {
        headers: { overrideAccess: 'true', 'x-payload-override-access': 'true' },
        data: { name: 'override-attempt', overrideAccess: true },
      })
      expect([403, 404]).toContain(response.status())
      const stored = await admin.get(`/api/users/${doc.id}?depth=0`)
      expect(((await stored.json()) as { name: string }).name).toBe(target.name)
    } finally {
      await editor.dispose()
    }
  })

  test('someone signed out cannot list accounts by sending it', async ({ request }) => {
    const response = await request.get('/api/users?overrideAccess=true', { headers: { overrideAccess: 'true' } })
    expect(response.status()).toBe(403)
  })
})

test.describe('with the flag off (every server)', () => {
  test('the test collection has no API route', async ({ request }) => {
    expect((await request.get('/api/e2e-drafts')).status()).toBe(404)
    expect((await admin.get('/api/e2e-drafts')).status()).toBe(404)
  })

  test('the test collection has no admin screen', async () => {
    // The admin panel builds its screens from the same permissions the administrator gets here.
    const response = await admin.get('/api/access')
    expect(response.status()).toBe(200)
    const { collections } = (await response.json()) as { collections?: Record<string, unknown> }
    expect(Object.keys(collections ?? {})).toContain('users')
    expect(Object.keys(collections ?? {})).not.toContain('e2e-drafts')
  })
})
