import type { CollectionConfig } from 'payload'

import { canSaveContent, isEditorOrAbove, isPublisherOrAbove, publishedOnly } from '../../access'
import { guardPublishedContent } from '../../access/guard-published-content'

/**
 * Test-only: the smallest drafts-enabled collection, so the content access rules (`canSaveContent`,
 * `publishedOnly`) can be tested before Step 4 adds real content collections. Registered only when
 * E2E_TEST_COLLECTIONS=true, which production refuses (src/lib/env.ts). Its tables exist in every
 * database, empty, because they are in the committed migrations (docs/DECISIONS.md D-050).
 */
export const E2EDrafts: CollectionConfig = {
  slug: 'e2e-drafts',
  admin: { hidden: true },
  versions: { drafts: true },
  access: {
    read: publishedOnly,
    readVersions: isEditorOrAbove,
    create: canSaveContent,
    update: canSaveContent,
    delete: isPublisherOrAbove,
  },
  hooks: {
    beforeOperation: [guardPublishedContent],
  },
  fields: [{ name: 'title', type: 'text', required: true }],
}
