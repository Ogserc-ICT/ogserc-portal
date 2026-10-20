import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { denyByDefault } from './access/deny-by-default'
import { hardenPayloadInternals } from './access/payload-internals'
import { Media } from './collections/Media'
import { TEST_COLLECTIONS, testCollectionsEnabled } from './collections/test'
import { Users } from './collections/Users'
import { assertServerEnv, csrfOrigins, siteOrigin } from './lib/env'
import { queryLimits } from './lib/query-limits'
import { onPayloadInit } from './lib/startup'
import { MAX_UPLOAD_BYTES } from './lib/uploads/limits'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

assertServerEnv(process.env)

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

/**
 * The assembled config. `withTestCollections` adds the test-only collections (src/collections/test);
 * the default export decides it with testCollectionsEnabled. Exported so the unit tests can audit both.
 * hardenPayloadInternals runs on the finished config, after Payload adds its own collections.
 */
export const portalConfig = ({ withTestCollections }: { withTestCollections: boolean }) =>
  buildConfig({
    // The normalised origin, so links and the CSRF list never carry a trailing slash or path.
    serverURL: siteOrigin(process.env),
    // Cookie-authenticated requests are accepted only from the site's own origin; requests without
    // an Origin header need Sec-Fetch-Site same-origin, same-site or none (Payload's extractJWT).
    // Requests that send the token in the Authorization header are not affected.
    csrf: csrfOrigins(process.env),
    admin: {
      user: Users.slug,
      importMap: {
        baseDir: path.resolve(dirname),
      },
    },
    collections: [Users, Media, ...(withTestCollections ? TEST_COLLECTIONS : [])],
    editor: lexicalEditor(),
    secret: requireEnv('PAYLOAD_SECRET'),
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
      // The committed types describe the deployed config, so a development start with the test
      // collections (a test script) must not rewrite them (D-050).
      autoGenerate: !withTestCollections,
    },
    // The site reads content through Payload's local API and REST; GraphQL is unused.
    graphQL: {
      disable: true,
    },
    db: postgresAdapter({
      pool: {
        connectionString: requireEnv('DATABASE_URL'),
      },
      // Schema changes go through committed migration files, never automatic "push".
      push: false,
      // A wrong database name must fail, not create an empty database that the migrations then
      // fill, leaving first-register open to anyone (D-051).
      disableCreateDatabase: true,
      migrationDir: path.resolve(dirname, 'migrations'),
      prodMigrations: migrations,
    }),
    sharp,
    // Ceiling for any uploaded file; collections set lower limits (Media: 10 MB images).
    upload: {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    },
    telemetry: false,
    onInit: onPayloadInit,
    // denyByDefault runs after every other plugin (its `order` is the highest), so it also covers
    // collections that plugins add. Keep it last here too, for readers.
    plugins: [queryLimits, denyByDefault],
  }).then(hardenPayloadInternals)

export default portalConfig({ withTestCollections: testCollectionsEnabled(process.env) })
