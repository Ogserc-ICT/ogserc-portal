import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'
import os from 'node:os'
import path from 'node:path'

import { assertWipeableTestDatabase, describeDatabase } from './tests/support/test-db'

// Tests that need a database (sign-in, roles, uploads). They run against their own server, started
// here with DATABASE_URL set to TEST_DATABASE_URL, on its own port, and never an existing server.
// The test database is emptied first (tests/support/reset-test-db.ts). See docs/RUNBOOK.md.

const isCI = !!process.env.CI

// Refuses before anything starts if TEST_DATABASE_URL could be the normal database.
const testDatabase = assertWipeableTestDatabase(process.env)
if (!process.env.E2E_DB_IDENTITY_FILE) {
  console.log(`[e2e-db] Test database: ${describeDatabase(testDatabase)}`)
  // Set once in the runner; worker processes inherit them.
  process.env.E2E_DB_IDENTITY_FILE = path.join(os.tmpdir(), `ogserc-e2e-db-${process.pid}.json`)
  process.env.E2E_ADMIN_FILE = path.join(os.tmpdir(), `ogserc-e2e-admin-${process.pid}.json`)
}

const port = Number(process.env.E2E_DB_PORT ?? 3100)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e-db',
  forbidOnly: isCI,
  // Tests share one database, so they run one at a time and never retry over changed state.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: isCI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-db' }]] : 'list',
  globalSetup: './tests/e2e-db/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    // Must run first, on the empty database. It creates the administrator the others sign in with.
    { name: 'first-user', testMatch: 'first-user.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'media', testMatch: 'media.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // CI tests the production build; locally a dev server with its own build folder, so it never
    // clashes with a dev server you already have running.
    command: `pnpm payload run tests/support/reset-test-db.ts && ${isCI ? 'pnpm start' : 'pnpm dev'}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      PROTECTED_DATABASE_URL: process.env.DATABASE_URL ?? '',
      E2E_DB_IDENTITY_FILE: process.env.E2E_DB_IDENTITY_FILE,
      PORT: String(port),
      SITE_URL: baseURL,
      // Local dev server only: build into .next-e2e (next.config.ts). CI uses the production build.
      ...(isCI ? {} : { E2E_TEST_SERVER: 'true' }),
    },
  },
})
