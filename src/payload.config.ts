import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

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

export default loadSharp().then((sharp) =>
  buildConfig({
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
    ...(sharp ? { sharp } : {}),
    telemetry: false,
  }),
)
