// Test-only: exercises the content save rules (canSaveContent, guardPublishedContent,
// publishedOnly) on the test-only `e2e-drafts` collection (D-050), with access enforced:
// - through Payload's Local API (`overrideAccess: false` and a real user), and
// - through Payload's REST pipeline (`handleEndpoints`, which the site's /api routes call), with
//   real session tokens in the Authorization header.
// The test server never registers test collections, so both run here, in a `payload run` script
// with E2E_TEST_COLLECTIONS=true. Run by tests/e2e-db/drafts.spec.ts through db-script.ts:
//   pnpm payload run tests/support/drafts-scenario.ts <editor email> <publisher email>
// with the two accounts' session tokens in E2E_DRAFTS_TOKENS (JSON).
//
// It records what happened in each case; the spec decides what should have happened. Every case
// works on its own documents, so the cases run in parallel; the result lists any document shared
// between cases. Same safeguards as strip-roles.ts: the guard, DATABASE_URL must be the test
// database, and the live connection must report it. It writes only e2e-drafts documents. Success
// is confirmed in E2E_SCRIPT_CONFIRM_FILE, because `payload run` can exit with code 0 without
// running (D-047).

import { writeFile } from 'node:fs/promises'

import type { Payload } from 'payload'

import { assertWipeableTestDatabase, databaseIdentity, describeDatabase, sameDatabase } from './test-db'

const COLLECTION = 'e2e-drafts'

type Id = number | string
type Doc = { id: Id; title?: string; _status?: string }
type Staff = Record<string, unknown> & { id: Id }
type Status = 'draft' | 'published'

/** A document after a case: as stored, and as the public sees it (null: not visible). */
export type DocState = { title?: string; _status?: string; public: { title?: string } | null }

/** What one case did: the error it threw (if any) and its documents afterwards, seeded ones first. */
export type CaseResult = { error: string | null; docs: (DocState | null)[] }

export type ScenarioResult = {
  cases: Record<string, CaseResult>
  /** Document ids used by more than one case; must be empty. */
  sharedIds: string[]
  publicList: string[]
  publicVersions: string | null
  /** Drafts an anonymous REST request saw while sending overrideAccess and draft. */
  anonymousRestDrafts: number | null
}

// The generated types describe the deployed config, which has no test collections (D-050), so
// the Local API is used through this narrow, untyped view.
type LooseApi = {
  [K in 'create' | 'update' | 'delete' | 'duplicate' | 'restoreVersion' | 'findByID']: (
    args: Record<string, unknown>,
  ) => Promise<Doc>
} & {
  find(args: Record<string, unknown>): Promise<{ docs: Doc[] }>
  findVersions(args: Record<string, unknown>): Promise<{ docs: { id: Id; version: Doc }[] }>
}

function fail(message: string): never {
  console.error(`[drafts-scenario] ${message}`)
  process.exit(1)
}

const errorName = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error'

async function main(): Promise<void> {
  const [editorEmail, publisherEmail] = process.argv.slice(2)
  for (const email of [editorEmail, publisherEmail]) {
    if (!email?.endsWith('@test.invalid')) fail('Pass the editor and publisher emails of @test.invalid accounts.')
  }
  if (!process.env.PROTECTED_DATABASE_URL) fail('PROTECTED_DATABASE_URL is not set.')
  if (!process.env.E2E_SCRIPT_CONFIRM_FILE) fail('E2E_SCRIPT_CONFIRM_FILE is not set.')
  const tokens = JSON.parse(process.env.E2E_DRAFTS_TOKENS ?? '{}') as { editor?: string; publisher?: string }
  if (!tokens.editor || !tokens.publisher) fail('E2E_DRAFTS_TOKENS must hold the editor and publisher tokens.')
  const target = assertWipeableTestDatabase({ ...process.env, DATABASE_URL: process.env.PROTECTED_DATABASE_URL })
  const connectingTo = databaseIdentity(process.env.DATABASE_URL)
  if (!connectingTo || !sameDatabase(connectingTo, target)) {
    fail(`DATABASE_URL (${describeDatabase(connectingTo)}) is not the test database (${describeDatabase(target)}).`)
  }

  const [{ getPayload, handleEndpoints }, { default: config }, { connectedDatabase }] = await Promise.all([
    import('payload'),
    import('../../src/payload.config'),
    import('../../src/lib/startup'),
  ])
  const payload: Payload = await getPayload({ config })
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`The live connection is ${describeDatabase(live)}. Nothing was changed.`)
  if (!(COLLECTION in payload.collections)) fail(`${COLLECTION} is not registered; E2E_TEST_COLLECTIONS must be "true".`)
  const api = payload as unknown as LooseApi

  // Local API users need `collection` set, as a signed-in REST request has it.
  const staff = async (email: string): Promise<Staff> => {
    const { docs } = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })
    if (!docs[0]) fail(`No account ${email}.`)
    return { ...docs[0], collection: 'users' } as Staff
  }
  const editor = await staff(editorEmail!)
  const publisher = await staff(publisherEmail!)
  const as = (user: Staff) => ({ collection: COLLECTION, overrideAccess: false, user })
  const trusted = { collection: COLLECTION } // Local API default: overrideAccess true

  /** A REST request through Payload's own pipeline. Throws on a non-2xx answer, like the Local API. */
  async function rest(
    method: string,
    path: string,
    options: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<unknown> {
    const headers: Record<string, string> = { ...options.headers }
    if (options.token) headers.Authorization = `JWT ${options.token}`
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'
    const request = new Request(`${process.env.SITE_URL ?? 'http://localhost:3000'}/api${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    const response = await handleEndpoints({ config, request })
    const json = (await response.json().catch(() => null)) as unknown
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return json
  }
  const bulkWhere = (ids: Id[]) => ids.map((id, i) => `where[id][in][${i}]=${encodeURIComponent(String(id))}`).join('&')

  /** A document set up by trusted code, so each case starts from a known state. */
  const seed = async (status: Status): Promise<Doc> =>
    api.create({
      ...trusted,
      data: { title: status === 'published' ? 'original' : 'original-draft', _status: status },
      draft: status === 'draft',
    })

  /** Version ids of a document, newest first, with each version's status. */
  const versionsOf = async (id: Id) =>
    (await api.findVersions({ ...trusted, where: { parent: { equals: id } }, sort: '-updatedAt', depth: 0 })).docs

  const state = async (id: Id): Promise<DocState | null> => {
    const doc = await api.findByID({ ...trusted, id, depth: 0 }).catch(() => null)
    if (!doc) return null
    const seen = await api.findByID({ collection: COLLECTION, id, depth: 0, overrideAccess: false }).catch(() => null)
    return { title: doc.title, _status: doc._status, public: seen ? { title: seen.title } : null }
  }

  /**
   * One case: seed its documents, act, then record the error and every document's state. A
   * document the action creates (create, duplicate) is added after the seeded ones.
   */
  type Case = { seed?: Status[]; action: (docs: Doc[]) => Promise<unknown> }
  async function run({ seed: statuses = [], action }: Case): Promise<{ result: CaseResult; ids: Id[] }> {
    const docs = await Promise.all(statuses.map(seed))
    const ids = docs.map((doc) => doc.id)
    let error: string | null = null
    try {
      const created = (await action(docs)) as { id?: Id; doc?: { id?: Id } } | undefined
      const createdId = created?.doc?.id ?? created?.id
      if (createdId !== undefined && !ids.includes(createdId)) ids.push(createdId)
    } catch (caught) {
      error = errorName(caught)
    }
    return { result: { error, docs: await Promise.all(ids.map(state)) }, ids }
  }

  /** Sets up versions: published 'original', then a draft version 'draft-version' on top. */
  const withDraftVersion = async (doc: Doc) => {
    await api.update({ ...trusted, id: doc.id, data: { title: 'draft-version' }, draft: true })
    return (await versionsOf(doc.id)).find((v) => v.version._status === 'draft')!.id
  }
  /** Sets up versions: published 'original', then published 'second'; returns the older one. */
  const withOlderPublishedVersion = async (doc: Doc) => {
    await api.update({ ...trusted, id: doc.id, data: { title: 'second', _status: 'published' } })
    return (await versionsOf(doc.id)).filter((v) => v.version._status === 'published').at(-1)!.id
  }

  const definitions: Record<string, Case> = {
    // --- Creating (Local API) ---
    'editor creates a draft': {
      action: () => api.create({ ...as(editor), data: { title: 'editor-draft', _status: 'draft' }, draft: true }),
    },
    'editor creates without _status': {
      action: () => api.create({ ...as(editor), data: { title: 'editor-no-status' } }),
    },
    'editor creates as published': {
      action: () => api.create({ ...as(editor), data: { title: 'editor-published', _status: 'published' } }),
    },
    'editor creates as published with draft: true': {
      action: () =>
        api.create({ ...as(editor), data: { title: 'editor-published-draft-flag', _status: 'published' }, draft: true }),
    },

    // --- Changing a published document (Local API) ---
    'editor updates a published document without _status': {
      seed: ['published'],
      action: ([doc]) => api.update({ ...as(editor), id: doc!.id, data: { title: 'changed-by-editor' } }),
    },
    'editor saves a draft of a published document': {
      seed: ['published'],
      action: ([doc]) =>
        api.update({ ...as(editor), id: doc!.id, data: { title: 'editor-draft-of-published' }, draft: true }),
    },
    'editor unpublishes a published document': {
      seed: ['published'],
      action: ([doc]) => api.update({ ...as(editor), id: doc!.id, data: { _status: 'draft' } }),
    },
    'editor deletes a published document': {
      seed: ['published'],
      action: ([doc]) => api.delete({ ...as(editor), id: doc!.id }),
    },
    // Fail closed: anything but the boolean `true` is not a draft save.
    'editor saves with draft as the string "true"': {
      seed: ['published'],
      action: ([doc]) => api.update({ ...as(editor), id: doc!.id, data: { title: 'string-draft' }, draft: 'true' }),
    },
    'editor saves a draft with no data': {
      seed: ['published'],
      action: ([doc]) => api.update({ ...as(editor), id: doc!.id, data: undefined, draft: true }),
    },
    'editor saves a draft with an unexpected _status': {
      seed: ['published'],
      action: ([doc]) =>
        api.update({ ...as(editor), id: doc!.id, data: { title: 'odd-status', _status: 'archived' }, draft: true }),
    },

    // --- Publishing a draft (Local API) ---
    'editor publishes a draft': {
      seed: ['draft'],
      action: ([doc]) => api.update({ ...as(editor), id: doc!.id, data: { _status: 'published' } }),
    },
    'editor publishes a draft with draft: true': {
      seed: ['draft'],
      action: ([doc]) => api.update({ ...as(editor), id: doc!.id, data: { _status: 'published' }, draft: true }),
    },
    'editor updates a draft without _status': {
      seed: ['draft'],
      action: ([doc]) => api.update({ ...as(editor), id: doc!.id, data: { title: 'draft-changed-by-editor' } }),
    },

    // --- Bulk updates (Local API) ---
    'editor bulk-updates a published and a draft document': {
      seed: ['published', 'draft'],
      action: (docs) =>
        api.update({ ...as(editor), where: { id: { in: docs.map((d) => d.id) } }, data: { title: 'bulk-by-editor' } }),
    },
    'editor bulk-updates two drafts': {
      seed: ['draft', 'draft'],
      action: (docs) =>
        api.update({ ...as(editor), where: { id: { in: docs.map((d) => d.id) } }, data: { title: 'bulk-drafts' } }),
    },

    // --- Versions (Local API) ---
    'editor restores a draft version over a published document': {
      seed: ['published'],
      action: async ([doc]) => api.restoreVersion({ ...as(editor), id: await withDraftVersion(doc!) }),
    },
    // Payload's Local API restoreVersion drops `draft`, so this is a normal restore and is refused.
    'editor restores a draft version, asking the Local API for a draft': {
      seed: ['published'],
      action: async ([doc]) => api.restoreVersion({ ...as(editor), id: await withDraftVersion(doc!), draft: true }),
    },
    'editor restores an older published version': {
      seed: ['published'],
      action: async ([doc]) => api.restoreVersion({ ...as(editor), id: await withOlderPublishedVersion(doc!) }),
    },
    'publisher restores an older published version': {
      seed: ['published'],
      action: async ([doc]) => api.restoreVersion({ ...as(publisher), id: await withOlderPublishedVersion(doc!) }),
    },

    // --- Duplicating (Local API) ---
    'editor duplicates a published document': {
      seed: ['published'],
      action: ([doc]) => api.duplicate({ ...as(editor), id: doc!.id, data: { title: 'duplicated-by-editor' } }),
    },
    'editor duplicates a published document as a draft': {
      seed: ['published'],
      action: ([doc]) =>
        api.duplicate({ ...as(editor), id: doc!.id, data: { title: 'duplicated-as-draft' }, draft: true }),
    },
    'publisher duplicates a published document': {
      seed: ['published'],
      action: ([doc]) => api.duplicate({ ...as(publisher), id: doc!.id, data: { title: 'duplicated-by-publisher' } }),
    },

    // --- Publishers, and trusted server code ---
    'publisher publishes a draft': {
      seed: ['draft'],
      action: ([doc]) =>
        api.update({ ...as(publisher), id: doc!.id, data: { title: 'published-by-publisher', _status: 'published' } }),
    },
    'publisher unpublishes a published document': {
      seed: ['published'],
      action: ([doc]) => api.update({ ...as(publisher), id: doc!.id, data: { _status: 'draft' } }),
    },
    'trusted code changes a published document': {
      seed: ['published'],
      action: ([doc]) => api.update({ ...trusted, id: doc!.id, data: { title: 'trusted-change' } }),
    },

    // --- The same through REST ---
    'REST: editor updates a published document without _status': {
      seed: ['published'],
      action: ([doc]) =>
        rest('PATCH', `/${COLLECTION}/${doc!.id}`, { token: tokens.editor, body: { title: 'rest-changed-by-editor' } }),
    },
    'REST: editor saves a draft of a published document': {
      seed: ['published'],
      action: ([doc]) =>
        rest('PATCH', `/${COLLECTION}/${doc!.id}?draft=true`, { token: tokens.editor, body: { title: 'rest-draft' } }),
    },
    'REST: editor unpublishes a published document': {
      seed: ['published'],
      action: ([doc]) =>
        rest('PATCH', `/${COLLECTION}/${doc!.id}`, { token: tokens.editor, body: { _status: 'draft' } }),
    },
    'REST: editor bulk-updates a published and a draft document': {
      seed: ['published', 'draft'],
      action: (docs) =>
        rest('PATCH', `/${COLLECTION}?${bulkWhere(docs.map((d) => d.id))}`, {
          token: tokens.editor,
          body: { title: 'rest-bulk-by-editor' },
        }),
    },
    'REST: editor restores a draft version over a published document': {
      seed: ['published'],
      action: async ([doc]) =>
        rest('POST', `/${COLLECTION}/versions/${await withDraftVersion(doc!)}`, { token: tokens.editor }),
    },
    'REST: editor restores a draft version as a draft': {
      seed: ['published'],
      action: async ([doc]) =>
        rest('POST', `/${COLLECTION}/versions/${await withDraftVersion(doc!)}?draft=true`, { token: tokens.editor }),
    },
    // REST duplicates are drafts unless ?draft=false (Payload's duplicate endpoint).
    'REST: editor duplicates a published document (a draft by default)': {
      seed: ['published'],
      action: ([doc]) =>
        rest('POST', `/${COLLECTION}/${doc!.id}/duplicate`, {
          token: tokens.editor,
          body: { title: 'rest-duplicated-by-editor' },
        }),
    },
    'REST: editor duplicates a published document with draft=false': {
      seed: ['published'],
      action: ([doc]) =>
        rest('POST', `/${COLLECTION}/${doc!.id}/duplicate?draft=false`, {
          token: tokens.editor,
          body: { title: 'rest-duplicated-not-draft' },
        }),
    },
    'REST: editor sends overrideAccess in the query, a header and the body': {
      seed: ['published'],
      action: ([doc]) =>
        rest('PATCH', `/${COLLECTION}/${doc!.id}?overrideAccess=true`, {
          token: tokens.editor,
          headers: { overrideAccess: 'true', 'x-payload-override-access': 'true' },
          body: { title: 'override-attempt', overrideAccess: true },
        }),
    },
  }

  const names = Object.keys(definitions)
  const runs = await Promise.all(names.map((name) => run(definitions[name]!)))
  const cases: Record<string, CaseResult> = Object.fromEntries(names.map((name, i) => [name, runs[i]!.result]))

  // Each case must have used its own documents.
  const owners = new Map<string, number>()
  for (const { ids } of runs) for (const id of ids) owners.set(String(id), (owners.get(String(id)) ?? 0) + 1)
  const sharedIds = [...owners].filter(([, count]) => count > 1).map(([id]) => id)

  // The public sees only published documents and no versions, even when asking for them.
  const { docs: publicDocs } = await api.find({ collection: COLLECTION, overrideAccess: false, depth: 0, limit: 200 })
  const publicVersions = await api
    .findVersions({ collection: COLLECTION, overrideAccess: false, depth: 0 })
    .then(() => null)
    .catch(errorName)
  const anonymousRestDrafts = await rest(
    'GET',
    `/${COLLECTION}?overrideAccess=true&draft=true&where[_status][equals]=draft&limit=200`,
    { headers: { overrideAccess: 'true' } },
  )
    .then((json) => (json as { docs: unknown[] }).docs.length)
    .catch(() => null)

  const result: ScenarioResult = {
    cases,
    sharedIds,
    publicList: publicDocs.map((d) => String(d._status)),
    publicVersions,
    anonymousRestDrafts,
  }
  await writeFile(process.env.E2E_SCRIPT_CONFIRM_FILE!, JSON.stringify(result))
  console.log(`[drafts-scenario] ${names.length} cases run in ${describeDatabase(live)}.`)
  process.exit(0)
}

// Awaited at the top level, so `payload run` does not exit before main() finishes.
await main().catch((error: unknown) => fail(error instanceof Error ? error.message : 'Failed.'))
