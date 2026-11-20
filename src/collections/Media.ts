import { type CollectionBeforeOperationHook, type CollectionConfig, ValidationError } from 'payload'

import { allowAll, isEditorOrAbove, isPublisherOrAbove, userCan } from '../access'
import { contentAuditHooks } from '../lib/audit/hooks'
import { IMAGE_MIME_TYPES, imageUploadProblem } from '../lib/uploads/image-signature'
import { MAX_IMAGE_BYTES } from '../lib/uploads/limits'

const mediaAudit = contentAuditHooks('media')

/**
 * Checks every uploaded file by its content before Payload stores it: an accepted image type,
 * with a declared type and extension that agree with the bytes, and no larger than the limit.
 *
 * The messages say which rule failed, so they are only for staff who may upload here. Anyone
 * else is left to the access check, which Payload runs after this hook and before it reads the
 * file, and which answers with its generic 403. Trusted server code (overrideAccess) is checked.
 */
export const acceptOnlyRealImages: CollectionBeforeOperationHook =({ args, operation, req }) => {
  if ((operation !== 'create' && operation !== 'update') || !req.file) return args
  const mayUpload = userCan(req.user, operation === 'create' ? 'content:edit' : 'content:publish')
  if (!mayUpload && (args as { overrideAccess?: boolean }).overrideAccess !== true) return args
  const { data, mimetype, name, size } = req.file
  const problem = data?.length
    ? imageUploadProblem({ data, mimetype, name, size }, MAX_IMAGE_BYTES)
    : 'The uploaded file could not be read.'
  if (problem) throw new ValidationError({ errors: [{ message: problem, path: 'file' }] })
  return args
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: allowAll,
    create: isEditorOrAbove,
    // Replacing a published image changes it everywhere it is used, so only publishers may.
    update: isPublisherOrAbove,
    delete: isPublisherOrAbove,
  },
  hooks: {
    beforeOperation: [acceptOnlyRealImages],
    // The audit log (D-083), in the request's transaction.
    afterChange: [mediaAudit.afterChange],
    afterDelete: [mediaAudit.afterDelete],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Local folder for uploaded files (Payload's default is `media`, relative to the working
    // directory). The database-backed tests point it at a throwaway folder. S3 storage replaces
    // local files in Step 4 (D-013).
    staticDir: process.env.MEDIA_DIR || 'media',
    // Exact types only: no wildcard, no SVG. Payload also checks these against the content.
    mimeTypes: [...IMAGE_MIME_TYPES],
  },
}
