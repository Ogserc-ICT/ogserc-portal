// The work behind `pnpm seed` (scripts/seed.ts runs it; do not run it alone):
//   SEED_DATABASE=<database name> pnpm payload run scripts/seed-payload.ts
//
// Adds clearly marked sample content of every type (src/lib/seed/sample-content.ts, FR-CMS-08,
// D-094) to a review or development database. Safeguards:
// - It refuses NODE_ENV=production, in which Payload would apply pending migrations on connect.
// - The database name typed after --database must be the one DATABASE_URL names, and the live
//   connection must be that database.
// - It refuses any database in which staff have created or changed content (the audit log).
// - It skips any sample that is already there, so running it twice adds nothing.
// It confirms itself in DB_SCRIPT_CONFIRM_FILE (D-047). It prints only the host and database name.

import { writeFile } from 'node:fs/promises'

import type { Payload } from 'payload'

import { databaseIdentity, describeDatabase, sameDatabase } from '../src/lib/db/identity'

function fail(message: string): never {
  console.error(`[seed] ${message}`)
  process.exit(1)
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    fail('Refusing to run with NODE_ENV=production. The seed is for review and development databases only.')
  }
  const target = databaseIdentity(process.env.DATABASE_URL)
  if (!target) fail('DATABASE_URL is not set or is not a Postgres URL with a database name.')
  if (process.env.SEED_DATABASE !== target.database) fail('Run it through pnpm seed --database <name>, with the name it shows.')

  const [{ getPayload }, { default: config }, { connectedDatabase }, seed] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('../src/lib/startup'),
    import('../src/lib/seed/sample-content'),
  ])
  const payload: Payload = await getPayload({ config })
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`Connected to ${describeDatabase(live)}, not ${describeDatabase(target)}. Nothing was changed.`)

  const { totalDocs: staffEntries } = await payload.count({
    collection: 'audit-log',
    where: { and: [{ action: { in: [...seed.CONTENT_ACTIONS] } }, { actor: { exists: true } }] },
  })
  const refusal = seed.seedRefusal(staffEntries)
  if (refusal) fail(`${describeDatabase(live)}: ${refusal}`)

  let created = 0
  let skipped = 0
  // Loose view of the Local API: the sample items are plain data, checked by Payload's own validation.
  const api = payload as unknown as {
    find(args: Record<string, unknown>): Promise<{ docs: { id: number | string }[] }>
    create(args: Record<string, unknown>): Promise<{ id: number | string }>
  }

  /** The id of an existing item where `field` equals `value`, drafts included. */
  const existing = async (collection: string, field: string, value: string) =>
    (await api.find({ collection, where: { [field]: { equals: value } }, limit: 1, depth: 0, draft: true })).docs[0]?.id

  async function ensure(collection: string, field: string, value: string, make: () => Promise<{ id: number | string }>) {
    const found = await existing(collection, field, value)
    if (found !== undefined) {
      skipped++
      return found
    }
    created++
    return (await make()).id
  }

  const fileTitle = seed.sample('document file')
  const file = await ensure('document-files', 'title', fileTitle, () => {
    const data = seed.samplePdf(fileTitle)
    return api.create({
      collection: 'document-files',
      data: { title: fileTitle },
      file: { data, mimetype: 'application/pdf', name: 'sample-document.pdf', size: data.length },
    })
  })
  const images: (number | string)[] = []
  for (const [n, colour] of seed.SAMPLE_COLOURS.entries()) {
    const alt = seed.sample(`image ${n + 1}: a plain green rectangle`)
    images.push(
      await ensure('media', 'alt', alt, () => {
        const data = seed.samplePng(colour)
        return api.create({ collection: 'media', data: { alt }, file: { data, mimetype: 'image/png', name: `sample-image-${n + 1}.png`, size: data.length } })
      }),
    )
  }

  const items = seed.sampleItems({ file, images })
  for (const collection of seed.SEEDED_COLLECTIONS) {
    for (const item of items[collection] ?? []) {
      await ensure(collection, 'title', item.title, () => api.create({ collection, data: item, draft: item._status === 'draft' }))
    }
  }

  console.log(`[seed] ${describeDatabase(live)}: ${created} sample items added, ${skipped} already there.`)
  if (process.env.DB_SCRIPT_CONFIRM_FILE) {
    await writeFile(process.env.DB_SCRIPT_CONFIRM_FILE, JSON.stringify({ ...live, created, skipped, at: new Date().toISOString() }))
  }
  process.exit(0)
}

// Awaited at the top level: `payload run` exits as soon as this module has loaded (D-047).
// A driver's message is not repeated: it can name the database user.
await main().catch((error: unknown) => {
  const message = error instanceof Error && 'data' in error ? JSON.stringify((error as { data?: unknown }).data).slice(0, 500) : ''
  fail(`The seed failed before it finished${message ? `: ${message}` : ' (see any error above)'}.`)
})
