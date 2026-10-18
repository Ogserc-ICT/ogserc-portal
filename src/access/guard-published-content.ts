// Only publishers and administrators change what the public sees (FR-CMS-06, SRS Section 10).
//
// canSaveContent cannot enforce this alone. Payload runs create/update access on the request's
// `data` before it decides `_status`, without the stored document and without the draft flag, so
// an editor could change a published document by leaving `_status` out, or unpublish it by
// sending `_status: 'draft'`. A duplicate copies the original's `_status`, and a version restore
// has its own operation. This hook sees the whole operation (draft flag, id or where, data) and
// fails closed: anything it does not recognise as safe is refused. Tested in
// tests/e2e-db/drafts.spec.ts; required on every collection that uses canSaveContent
// (tests/unit/config-access.spec.ts). See docs/DECISIONS.md D-049.

import { type CollectionBeforeOperationHook, Forbidden, type PayloadRequest, type Where } from 'payload'

import { isStaffUser, userCan } from './index'

type OperationArgs = {
  data?: unknown
  draft?: unknown
  duplicateFromID?: unknown
  id?: number | string
  overrideAccess?: unknown
  publishAllLocales?: unknown
  publishSpecificLocale?: unknown
  unpublishAllLocales?: unknown
  where?: Where
}

const GUARDED_OPERATIONS = new Set(['create', 'update', 'restoreVersion'])

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Draft saves may only leave `_status` out or set it to 'draft'. */
const isDraftStatus = (data: Record<string, unknown>): boolean => data._status === undefined || data._status === 'draft'

async function anyPublished(req: PayloadRequest, collection: string, target: Where): Promise<boolean> {
  const { totalDocs } = await req.payload.count({
    collection: collection as never,
    where: { and: [target, { _status: { equals: 'published' } }] },
    overrideAccess: true,
    req, // same transaction as the operation
  })
  return totalDocs > 0
}

/** The document a version belongs to, or undefined if the version does not exist. */
async function versionParent(req: PayloadRequest, collection: string, versionId: number | string) {
  const version = await req.payload
    .findVersionByID({ collection: collection as never, id: versionId as never, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  return (version as { parent?: number | string | { id: number | string } } | null)?.parent
}

export const guardPublishedContent: CollectionBeforeOperationHook = async ({ args, collection, operation, req }) => {
  if (!GUARDED_OPERATIONS.has(operation)) return args
  const a = args as OperationArgs
  // Trusted server code only: Payload never takes overrideAccess from a request.
  if (a.overrideAccess === true) return args
  if (userCan(req.user, 'content:publish')) return args
  // Anyone else who is not staff is refused by access anyway; refuse here without querying.
  if (!isStaffUser(req.user)) throw new Forbidden(req.t)
  // Per-locale publishing (only with localization, which this site does not use) is publishing.
  if (a.publishAllLocales || a.publishSpecificLocale || a.unpublishAllLocales) throw new Forbidden(req.t)

  const isDraftSave = a.draft === true
  const slug = collection.slug

  if (operation === 'restoreVersion') {
    if (isDraftSave) return args // restored as a draft; the published version is untouched
    if (a.id === undefined) throw new Forbidden(req.t)
    const parent = await versionParent(req, slug, a.id)
    if (parent === undefined || parent === null) throw new Forbidden(req.t)
    const parentId = typeof parent === 'object' ? parent.id : parent
    if (await anyPublished(req, slug, { id: { equals: parentId } })) throw new Forbidden(req.t)
    return args
  }

  if (!isPlainObject(a.data)) throw new Forbidden(req.t)
  if (isDraftSave) {
    if (!isDraftStatus(a.data)) throw new Forbidden(req.t)
    return args
  }

  if (operation === 'create') {
    // A duplicate copies the original's status, which create access never sees.
    if (a.duplicateFromID !== undefined && a.duplicateFromID !== null) throw new Forbidden(req.t)
    if (!isDraftStatus(a.data)) throw new Forbidden(req.t)
    return args
  }

  // update: by id, or in bulk with a where. A non-draft save writes the published version.
  const target: Where | undefined = a.id !== undefined ? { id: { equals: a.id } } : a.where
  if (!target) throw new Forbidden(req.t)
  if (await anyPublished(req, slug, target)) throw new Forbidden(req.t)
  return args
}
