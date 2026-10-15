import type { CollectionConfig } from 'payload'

import { allowAll, isEditorOrAbove, isPublisherOrAbove } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: allowAll,
    create: isEditorOrAbove,
    update: isEditorOrAbove,
    delete: isPublisherOrAbove,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
