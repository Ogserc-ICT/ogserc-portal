import path from 'node:path'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

import { SNAPSHOT } from './data/content-2026-11'

// Repairs the photographs that 20261124_103400_real_content uploaded (D-097). With S3 storage, the
// storage plugin kept the first file of the migration's request and stored it again for every later
// upload, so on the live site every photo after the first slide's was a copy of it, while each
// record's name, size and description were right. This uploads each original again over its own
// record, under the same file name, so pages, links and staff edits stay as they are. Only the
// content migration's own records are touched (file name and description both match); a photo
// staff have replaced or deleted is left alone. Harmless where the files were already right.

const ASSETS = path.resolve(process.cwd(), 'src/assets')

type Photo = { file: string; alt: string }

const [story] = SNAPSHOT.newsArticles
const PHOTOS: Photo[] = [
  ...SNAPSHOT.heroSlides.map((_, n) => ({ file: `hero/hero-${n + 1}.jpg`, alt: `Homepage slide photograph ${n + 1}` })),
  ...story.photos.map(({ full, alt }) => ({ file: full, alt })),
  { file: 'updates/consultation-cp-2026-001.jpg', alt: 'Cover pages of consultation paper OGSERC/CP/2026/001 and the draft Order' },
]

/** Forget the previous upload, so the storage plugin stores this request's own file. */
function forgetPreviousUpload(req: PayloadRequest) {
  if (req.context) delete (req.context as Record<string, unknown>)._payloadCloudStorage
  req.file = undefined
  req.payloadUploadSizes = undefined
}

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const photo of PHOTOS) {
    const { docs } = await payload.find({
      collection: 'media',
      where: { and: [{ filename: { equals: path.basename(photo.file) } }, { alt: { equals: photo.alt } }] },
      limit: 1,
      depth: 0,
      req,
    })
    const record = docs[0]
    if (!record) continue
    forgetPreviousUpload(req)
    await payload.update({
      collection: 'media',
      id: record.id,
      data: {},
      filePath: path.join(ASSETS, photo.file),
      overwriteExistingFiles: true,
      req,
    })
  }
  forgetPreviousUpload(req)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Nothing to undo: the files are the originals.
}
