import path from 'path'
import { type CollectionBeforeOperationHook, type CollectionConfig, ValidationError } from 'payload'

import { allowAll, isEditorOrAbove, isPublisherOrAbove, userCan } from '../access'
import { PUBLIC_READ } from '../access/two-factor'
import { uploadAuditHooks } from '../lib/audit/hooks'
import { DOCUMENT_MIME_TYPES, documentUploadProblem } from '../lib/uploads/document-signature'
import { MAX_DOCUMENT_BYTES } from '../lib/uploads/limits'

const fileAudit = uploadAuditHooks('document-files')

/**
 * Checks every uploaded file by its content before Payload stores it: a PDF, Word (.docx) or Excel
 * (.xlsx) file without macros, whose declared type and extension agree with it, within the limit.
 * As for images (Media), the messages are only for staff who may upload here; anyone else gets the
 * access check's generic 403. Trusted server code (overrideAccess) is checked too.
 */
export const acceptOnlyRealDocuments: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if ((operation !== 'create' && operation !== 'update') || !req.file) return args
  const mayUpload = userCan(req.user, operation === 'create' ? 'content:edit' : 'content:publish')
  if (!mayUpload && (args as { overrideAccess?: boolean }).overrideAccess !== true) return args
  const { data, mimetype, name, size } = req.file
  const problem = data?.length
    ? documentUploadProblem({ data, mimetype, name, size }, MAX_DOCUMENT_BYTES)
    : 'The uploaded file could not be read.'
  if (problem) throw new ValidationError({ errors: [{ message: problem, path: 'file' }] })
  return args
}

/**
 * The files of regulatory documents, reports and other downloads (FR-DOC-02, FR-REP-02). Public from
 * the moment they are uploaded, before the item that uses them is published (owner, D-089): staff
 * must never upload anything confidential. Images go in Media.
 */
export const DocumentFiles: CollectionConfig = {
  slug: 'document-files',
  labels: { singular: 'Document file', plural: 'Document files' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'filename', 'filesize', 'updatedAt'],
    description:
      'PDF, Word (.docx) and Excel (.xlsx) files, up to 25 MB. Anyone with a file\'s address can open it as soon as it is uploaded, so never upload anything confidential.',
  },
  custom: PUBLIC_READ,
  access: {
    read: allowAll,
    create: isEditorOrAbove,
    // Replacing a file changes every published item that uses it, so only publishers may.
    update: isPublisherOrAbove,
    delete: isPublisherOrAbove,
  },
  hooks: {
    beforeOperation: [acceptOnlyRealDocuments],
    afterChange: [fileAudit.afterChange],
    afterDelete: [fileAudit.afterDelete],
  },
  fields: [
    // As in Media: the S3 adapter's own field, defined here so the schema is the same without S3 (D-086).
    { name: '_objectKey', type: 'text', admin: { hidden: true, readOnly: true } },
    // The bucket folder (`document-files`, lib/uploads/storage.ts); also the adapter's own field, kept for the same reason.
    { name: 'prefix', type: 'text', admin: { hidden: true, readOnly: true } },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'For staff, to find the file. The public sees the title of the item that uses it.' },
    },
  ],
  upload: {
    // Local folder in development and tests (a subfolder of MEDIA_DIR when that is set, so the
    // database tests' throwaway folder holds both); the S3 bucket in production (D-086).
    staticDir: process.env.MEDIA_DIR ? path.join(process.env.MEDIA_DIR, 'document-files') : 'document-files',
    mimeTypes: [...DOCUMENT_MIME_TYPES],
  },
}
