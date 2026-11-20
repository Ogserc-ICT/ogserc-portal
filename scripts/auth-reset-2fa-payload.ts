// The reset behind `pnpm auth:reset-2fa` (scripts/auth-reset-2fa.ts runs it; do not run it alone):
//   AUTH_RESET_2FA_EMAIL=<email> pnpm payload run scripts/auth-reset-2fa-payload.ts
//
// Resets one staff account's two-factor sign-in with the same function as the admin panel's button
// (src/lib/auth/reset-two-factor.ts): clears the secret and the wrong-code count, ends every session,
// and records "Two-factor sign-in reset" in the audit log as server code. It changes nothing else.
// - It refuses NODE_ENV=production, in which Payload would apply pending migrations on connect.
// - It checks that the live connection is the database named in DATABASE_URL.
// - It reads the account back and confirms the result in DB_SCRIPT_CONFIRM_FILE (D-047).
// It prints only the host and database name, never a URL, and never repeats a driver's message.

import { writeFile } from 'node:fs/promises'

import { databaseIdentity, describeDatabase, sameDatabase } from '../src/lib/db/identity'

function fail(message: string): never {
  console.error(`[auth:reset-2fa] ${message}`)
  process.exit(1)
}

type Account = { id: number | string; totpSecret?: string | null; sessions?: unknown[] | null }

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    fail('Refusing to run with NODE_ENV=production: Payload would apply pending migrations. Unset it and run again.')
  }
  const email = process.env.AUTH_RESET_2FA_EMAIL
  if (!email) fail('Run it through pnpm auth:reset-2fa <email>.')
  const target = databaseIdentity(process.env.DATABASE_URL)
  if (!target) fail('DATABASE_URL is not set or is not a Postgres URL with a database name.')

  const [{ createLocalReq, getPayload }, { default: config }, { connectedDatabase }, { inTransaction, resetTwoFactor }] =
    await Promise.all([
      import('payload'),
      import('../src/payload.config'),
      import('../src/lib/startup'),
      import('../src/lib/auth/reset-two-factor'),
    ])
  const payload = await getPayload({ config })
  const live = await connectedDatabase(payload)
  if (!sameDatabase(live, target)) fail(`Connected to ${describeDatabase(live)}, not ${describeDatabase(target)}. Nothing was changed.`)

  const account = async (): Promise<Account | undefined> =>
    (await payload.db.findOne({ collection: 'users', where: { email: { equals: email } } })) as Account | undefined

  const before = await account()
  if (!before) fail(`No account with that email address in ${describeDatabase(live)}. Nothing was changed.`)
  const hadTwoFactor = Boolean(before.totpSecret)

  const req = await createLocalReq({}, payload)
  await inTransaction(req, () => resetTwoFactor(req, before.id, 'server code (pnpm auth:reset-2fa)'))

  const after = await account()
  if (!after || after.totpSecret || (after.sessions?.length ?? 0) > 0) {
    fail(`The account in ${describeDatabase(live)} still shows two-factor sign-in or a session after the reset.`)
  }
  console.log(`[auth:reset-2fa] Reset two-factor sign-in in ${describeDatabase(live)} (${hadTwoFactor ? 'it had it' : 'it had not set it up'}).`)
  if (process.env.DB_SCRIPT_CONFIRM_FILE) {
    const confirmation = { ...live, reset: true, hadTwoFactor, at: new Date().toISOString() }
    await writeFile(process.env.DB_SCRIPT_CONFIRM_FILE, JSON.stringify(confirmation))
  }
  process.exit(0)
}

// Awaited at the top level: `payload run` exits as soon as this module has loaded (D-047).
// The error itself is not repeated: a driver message can name the database user.
await main().catch(() => fail('The reset failed before it could finish (see any error above).'))
