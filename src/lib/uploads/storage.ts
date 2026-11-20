import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'

import { s3Settings } from './s3-settings'

// Where uploaded files live (D-013, D-086). In production: an S3-compatible bucket (Backblaze B2 on
// OGSERC's VPS), never the container's disk, which every deploy replaces. Locally and in CI: a
// folder (MEDIA_DIR). Any S3-compatible provider works, so the host or provider can change by
// settings alone (portability rules in CLAUDE.md).

/** Payload's S3 storage for Media, enabled only when every setting is present. */
export function mediaStorage(env: Record<string, string | undefined> = process.env): Plugin {
  const settings = s3Settings(env)
  const ready = settings && !('missing' in settings) ? settings : undefined
  return s3Storage({
    // Off without settings, so local development and CI keep their folder; the database schema is
    // the same either way.
    enabled: Boolean(ready),
    collections: { media: true },
    bucket: ready?.bucket ?? '',
    config: {
      region: ready?.region,
      endpoint: ready?.endpoint,
      // Path-style URLs (endpoint/bucket/key) work with every S3-compatible provider.
      forcePathStyle: true,
      credentials: { accessKeyId: ready?.accessKeyId ?? '', secretAccessKey: ready?.secretAccessKey ?? '' },
    },
  })
}
