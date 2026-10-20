// The unlock behind `pnpm auth:unlock` (scripts/auth-unlock.ts runs it; do not run it alone):
//   AUTH_UNLOCK_EMAIL=<email> pnpm payload run scripts/auth-unlock-payload.ts
//
// Clears one staff account's sign-in lock with Payload's own unlock operation, which sets
// loginAttempts to 0 and lockUntil to empty. It changes nothing else, and never deletes anything.
// - It refuses NODE_ENV=production, in which Payload would apply pending migrations on connect.
// - It checks that the live connection is the database named in DATABASE_URL.
// - It reads the account back and confirms the result in DB_SCRIPT_CONFIRM_FILE (D-047).
// It prints only the host and database name, never a URL, and never repeats a driver's message.

import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../src/lib/db/identity'

function fail(message: string): never {
  console.error(`[auth:unlock] ${message}`)
  process.exit(1)
}

type LockState = { id: number | string; lockUntil?: string | null; loginAttempts?: number | null }

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    fail('Refusing to run with NODE_ENV=production: Payload would apply pending migrations. Unset it and run again.')
  }
  const email = process.env.AUTH_UNLOCK_EMAIL
  if (!email) fail('Run it through pnpm auth:unlock <email>.')
  const target = databaseIdentity(process.env.DATABASE_URL)
  if (!target) fail('DATABASE_URL is not set or is not a Postgres URL with a database name.')

  const [{ getPayload }, { default: config }, { connectedDatabase }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
    import('../src/lib/startup'),
  ])
  const payload = await getPayload({ config })
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`Connected to ${describeDatabase(live)}, not ${describeDatabase(target)}. Nothing was changed.`)

  const lockState = async (): Promise<LockState | undefined> => {
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
    return docs[0] as LockState | undefined
  }

  const before = await lockState()
  if (!before) fail(`No account with that email address in ${describeDatabase(live)}. Nothing was changed.`)
  const wasLocked = Boolean(before.lockUntil && Date.parse(before.lockUntil) > Date.now())

  // Payload 3.90.2 types `data` as the login data (email and password), but the unlock operation
  // reads only the email (payload/dist/auth/operations/unlock.js). No password is needed or sent.
  const data = { email } as { email: string; password: string }
  await payload.unlock({ collection: 'users', data, overrideAccess: true })

  const after = await lockState()
  if (!after || after.lockUntil || (after.loginAttempts ?? 0) !== 0) {
    fail(`The account in ${describeDatabase(live)} still shows a lock after the unlock.`)
  }
  console.log(`[auth:unlock] Unlocked the account in ${describeDatabase(live)} (${wasLocked ? 'it was locked' : 'it was not locked'}).`)
  if (process.env.DB_SCRIPT_CONFIRM_FILE) {
    const confirmation = { ...live, unlocked: true, wasLocked, at: new Date().toISOString() }
    await writeFile(process.env.DB_SCRIPT_CONFIRM_FILE, JSON.stringify(confirmation))
  }
  process.exit(0)
}

// Awaited at the top level: `payload run` exits as soon as this module has loaded (D-047).
// The error itself is not repeated: a driver message can name the database user.
await main().catch(() => fail('The unlock failed before it could finish (see any error above).'))
