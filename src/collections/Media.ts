import { type CollectionBeforeOperationHook, type CollectionConfig, ValidationError } from 'payload'

import { allowAll, isEditorOrAbove, isPublisherOrAbove } from '../access'
import { IMAGE_MIME_TYPES, imageUploadProblem } from '../lib/uploads/image-signature'
import { MAX_IMAGE_BYTES } from '../lib/uploads/limits'

/**
 * Checks every uploaded file by its content before Payload stores it: an accepted image type,
 * with a declared type and extension that agree with the bytes, and no larger than the limit.
 */
const acceptOnlyRealImages: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if ((operation !== 'create' && operation !== 'update') || !req.file) return args
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
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Exact types only: no wildcard, no SVG. Payload also checks these against the content.
    mimeTypes: [...IMAGE_MIME_TYPES],
  },
}
