import { readFile } from 'node:fs/promises'

import type { FullConfig } from '@playwright/test'

import { type DatabaseIdentity, databaseIdentity, describeDatabase, sameDatabase } from '../support/test-db'

const WAIT_MS = 60_000

async function readIdentity(file: string): Promise<DatabaseIdentity | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as DatabaseIdentity
  } catch {
    return null
  }
}

/**
 * Aborts the run unless the server under test is connected to TEST_DATABASE_URL. The server
 * reports the database it really uses (src/lib/startup.ts) in the file named by
 * E2E_DB_IDENTITY_FILE once Payload has started.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL
  const file = process.env.E2E_DB_IDENTITY_FILE
  const expected = databaseIdentity(process.env.TEST_DATABASE_URL)
  if (!baseURL || !file || !expected) throw new Error('[e2e-db] Harness is not configured (see playwright.db.config.ts).')

  const deadline = Date.now() + WAIT_MS
  let actual: DatabaseIdentity | null = null
  while (!actual && Date.now() < deadline) {
    // Payload starts on first use; any API request starts it.
    await fetch(`${baseURL}/api/users/init`).catch(() => undefined)
    actual = await readIdentity(file)
    if (!actual) await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  if (!actual) throw new Error('[e2e-db] The server did not report which database it uses. Aborting.')

  console.log(`[e2e-db] Server under test is connected to ${describeDatabase(actual)}`)
  if (!sameDatabase(actual, expected)) {
    throw new Error(`[e2e-db] Expected ${describeDatabase(expected)}. Aborting before any test runs.`)
  }

  // The reset verified there were no users; check again now the server is up, so anything that
  // wrote to the database in between (an earlier server still running, say) stops the run here.
  const init = await fetch(`${baseURL}/api/users/init`)
  const { initialized } = (await init.json()) as { initialized?: unknown }
  if (initialized !== false) {
    throw new Error(
      '[e2e-db] The test database already has a user account before any test ran, although the reset ' +
        'left it empty. Something wrote to it in between. Check test-results/e2e-db-server.log and ' +
        'whether an earlier test server is still running. Aborting.',
    )
  }
  console.log('[e2e-db] Confirmed: no user accounts before the first test.')
}
