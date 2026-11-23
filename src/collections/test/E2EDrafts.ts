import type { CollectionConfig } from 'payload'

import { contentCollection } from '../content/content-collection'

/**
 * Test-only: the smallest content collection, built with the same contentCollection() as every real
 * one, so the content rules (access, the published-content guard, autosave, scheduling, audit) are
 * tested on exactly what the real collections use. Registered only when E2E_TEST_COLLECTIONS=true,
 * which production refuses (src/lib/env.ts). Its tables exist in every database, empty, because they
 * are in the committed migrations (docs/DECISIONS.md D-050).
 */
export const E2EDrafts: CollectionConfig = contentCollection({
  slug: 'e2e-drafts',
  labels: { singular: 'Test item', plural: 'Test items' },
  admin: { hidden: true },
  fields: [{ name: 'title', type: 'text', required: true }],
})
