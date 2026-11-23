import type { CollectionConfig, Field } from 'payload'

import { canSaveContent, isEditorOrAbove, isPublisherOrAbove, publishedOnly } from '../../access'
import { guardPublishedContent } from '../../access/guard-published-content'
import { PUBLIC_READ, publicOrTwoFactor } from '../../access/two-factor'
import type { AuditTargetType } from '../../lib/audit/actions'
import { contentAuditHooks } from '../../lib/audit/content-hooks'

// The shared setup for every content collection (Step 4 plan, D-090), so the rules are written once:
//  - drafts, saved automatically while someone types, so work survives a sign-out (D-089);
//  - publishing can be scheduled (FR-CMS-04); a scheduled publish runs as the person who set it,
//    so an editor's schedule is refused like their publish (guardPublishedContent);
//  - version history (FR-CMS-05), and the audit log;
//  - the public reads only published items; editors save drafts; publishers publish and delete
//    (FR-CMS-06, SRS Section 10, D-049). Payload never takes overrideAccess from a request.

/** How often the admin panel saves a draft while someone types, in milliseconds. */
export const AUTOSAVE_INTERVAL_MS = 2000
/** Versions kept per item; older ones are removed by Payload. */
export const MAX_VERSIONS_PER_ITEM = 100

type ContentCollectionOptions = {
  slug: AuditTargetType
  labels: NonNullable<CollectionConfig['labels']>
  fields: Field[]
  admin?: CollectionConfig['admin']
  defaultSort?: CollectionConfig['defaultSort']
}

/** Top-level field names, for the audit log's "fields changed" list. */
function topLevelNames(fields: Field[]): string[] {
  return fields.flatMap((field) => {
    if ('name' in field && typeof field.name === 'string') return [field.name]
    // Rows, collapsibles and unnamed tabs only arrange fields; their fields are top level.
    if ('fields' in field && Array.isArray(field.fields)) return topLevelNames(field.fields)
    if (field.type === 'tabs') return field.tabs.flatMap((tab) => ('name' in tab && tab.name ? [tab.name] : topLevelNames(tab.fields)))
    return []
  })
}

export function contentCollection({ slug, labels, fields, admin, defaultSort }: ContentCollectionOptions): CollectionConfig {
  const audit = contentAuditHooks(slug, topLevelNames(fields))
  return {
    slug,
    labels,
    admin: { useAsTitle: 'title', ...admin },
    defaultSort: defaultSort ?? '-updatedAt',
    versions: {
      drafts: {
        autosave: { interval: AUTOSAVE_INTERVAL_MS },
        schedulePublish: true,
      },
      maxPerDoc: MAX_VERSIONS_PER_ITEM,
    },
    // Published items stay readable by visitors; staff (who also see drafts) need a verified code (D-084).
    custom: PUBLIC_READ,
    access: {
      read: publicOrTwoFactor(publishedOnly),
      readVersions: isEditorOrAbove,
      create: canSaveContent,
      update: canSaveContent,
      delete: isPublisherOrAbove,
    },
    hooks: {
      // The guard first: a refused save must not leave a note behind for the audit hook.
      beforeOperation: [guardPublishedContent, audit.noteSaveKind],
      afterChange: [audit.afterChange],
      afterDelete: [audit.afterDelete],
    },
    fields,
  }
}
