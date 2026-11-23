import type { CollectionConfig } from 'payload'

import type { AuditTargetType } from './actions'
import { changedFields, recordAudit, requestActor } from './record'

// Audit log entries for content items (FR-CMS-05, D-083, D-090): created, draft saved, published,
// unpublished, deleted, with the names of the fields that changed (never their values). Autosaves
// (D-089) are not logged one by one, since one is made every few seconds while someone types;
// version history keeps each of them, and the next manual save, publish or unpublish is logged.

type Hooks = NonNullable<CollectionConfig['hooks']>
type Hook<K extends keyof Hooks> = NonNullable<Hooks[K]>[number]

/** Set by noteSaveKind, read by afterChange in the same request. */
const SAVE_KIND = 'auditContentSave'
type SaveKind = { autosave: boolean; draft: boolean }

/** Fields that are never reported as changed: Payload's own bookkeeping. */
const BOOKKEEPING = new Set(['id', 'createdAt', 'updatedAt', '_status'])

type ContentDoc = { id: number | string; _status?: unknown; title?: unknown }

export function contentAuditHooks(type: AuditTargetType, fieldNames: readonly string[]) {
  const fields = fieldNames.filter((name) => !BOOKKEEPING.has(name))
  const target = (doc: ContentDoc) => ({ type, id: doc.id, label: doc.title })

  /** beforeOperation: notes whether this save is an autosave or a draft save. */
  const noteSaveKind: Hook<'beforeOperation'> = ({ args, operation, req }) => {
    if (operation === 'create' || operation === 'update') {
      const a = args as { autosave?: unknown; draft?: unknown }
      req.context[SAVE_KIND] = { autosave: a.autosave === true, draft: a.draft === true } satisfies SaveKind
    }
    return args
  }

  const afterChange: Hook<'afterChange'> = async ({ doc, operation, previousDoc, req }) => {
    const kind = (req.context?.[SAVE_KIND] as SaveKind | undefined) ?? { autosave: false, draft: false }
    const item = doc as ContentDoc
    const actor = requestActor(req)
    const published = item._status === 'published'
    if (operation === 'create') {
      await recordAudit(req, { action: published ? 'content.published' : 'content.created', actor, target: target(item) })
      return doc
    }
    if (kind.autosave) return doc
    const changed = changedFields(fields, previousDoc, doc)
    const details = changed.length > 0 ? { fields: changed } : undefined
    if (published) {
      await recordAudit(req, { action: 'content.published', actor, target: target(item), details })
    } else if (!kind.draft && (previousDoc as ContentDoc | undefined)?._status === 'published') {
      // A save that is not a draft save, leaving the item as a draft: the published version is withdrawn.
      await recordAudit(req, { action: 'content.unpublished', actor, target: target(item), details })
    } else {
      await recordAudit(req, { action: 'content.draft-saved', actor, target: target(item), details })
    }
    return doc
  }

  const afterDelete: Hook<'afterDelete'> = async ({ doc, req }) => {
    await recordAudit(req, { action: 'content.deleted', actor: requestActor(req), target: target(doc as ContentDoc) })
    return doc
  }

  return { noteSaveKind, afterChange, afterDelete }
}
