import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { denyByDefault } from './access/deny-by-default'
import { hardenPayloadInternals } from './access/payload-internals'
import { AuditLog } from './collections/AuditLog'
import { Media } from './collections/Media'
import { RateLimits } from './collections/RateLimits'
import { TEST_COLLECTIONS, testCollectionsEnabled } from './collections/test'
import { Users } from './collections/Users'
import { twoFactor } from './lib/auth/two-factor'
import { noSendEmail } from './lib/email/no-send'
import { assertServerEnv, csrfOrigins, siteOrigin } from './lib/env'
import { queryLimits } from './lib/query-limits'
import { onPayloadInit } from './lib/startup'
import { MAX_UPLOAD_BYTES } from './lib/uploads/limits'
import { mediaStorage } from './lib/uploads/storage'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

assertServerEnv(process.env)

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

// IMAGE_PROCESSING=off starts Payload without sharp, for a host whose CPU cannot run it
// (OGSERC's VPS, D-056). sharp is imported only when it is used, because importing it on
// such a CPU throws. Without it, uploads keep their original size and get no focal point.
async function loadSharp() {
  if (process.env.IMAGE_PROCESSING === 'off') return undefined
  return (await import('sharp')).default
}

/**
 * The assembled config. `withTestCollections` adds the test-only collections (src/collections/test);
 * the default export decides it with testCollectionsEnabled. Exported so the unit tests can audit both.
 * hardenPayloadInternals runs on the finished config, after Payload adds its own collections.
 */
export const portalConfig = async ({
  withTestCollections,
  twoFactorSignIn = true,
}: {
  withTestCollections: boolean
  /** Always on when deployed. Off only for the unit tests that audit the access rules as written. */
  twoFactorSignIn?: boolean
}) => {
  const sharp = await loadSharp()
  return buildConfig({
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
    collections: [Users, Media, AuditLog, RateLimits, ...(withTestCollections ? TEST_COLLECTIONS : [])],
    editor: lexicalEditor(),
    // The site sends no email (D-085); this also keeps Payload from writing emails to the log.
    email: noSendEmail,
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
    ...(sharp ? { sharp } : {}),
    // Ceiling for any uploaded file; collections set lower limits (Media: 10 MB images).
    upload: {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    },
    telemetry: false,
    onInit: onPayloadInit,
    // denyByDefault runs after every other plugin but two-factor sign-in (by `order`), so it also
    // covers collections that plugins add; twoFactor runs last and wraps every access rule (D-084).
    // Keep them in that order here too, for readers.
    plugins: [mediaStorage(), queryLimits, denyByDefault, twoFactor({ enabled: twoFactorSignIn })],
  }).then(hardenPayloadInternals)
}

export default portalConfig({ withTestCollections: testCollectionsEnabled(process.env) })
