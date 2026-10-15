import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { denyByDefault } from './access/deny-by-default'
import { hardenPayloadInternals } from './access/payload-internals'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { assertServerEnv } from './lib/env'
import { queryLimits } from './lib/query-limits'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

assertServerEnv(process.env)

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

// hardenPayloadInternals runs on the finished config, after Payload adds its own collections.
export default buildConfig({
  serverURL: process.env.SITE_URL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: requireEnv('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
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
    migrationDir: path.resolve(dirname, 'migrations'),
    prodMigrations: migrations,
  }),
  sharp,
  telemetry: false,
  // denyByDefault runs after every other plugin (its `order` is the highest), so it also covers
  // collections that plugins add. Keep it last here too, for readers.
  plugins: [queryLimits, denyByDefault],
}).then(hardenPayloadInternals)
