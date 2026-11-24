import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'
import os from 'node:os'
import path from 'node:path'

import { describeDatabase } from './src/lib/db/identity'
import { assertWipeableTestDatabase } from './tests/support/test-db'
import { emptyTestMediaDir, testMediaDir } from './tests/support/test-media-dir'
import { previousServerProblem } from './tests/support/test-server'

// Tests that need a database (sign-in, roles, uploads). They run against their own server, started
// here with DATABASE_URL set to TEST_DATABASE_URL, on its own port, and never an existing server.
// The test database is emptied first (tests/support/reset-test-db.ts). See docs/RUNBOOK.md.

const isCI = !!process.env.CI
// CI tests the production build ("start"); locally a dev server ("dev"). Tests read this to know
// which server answers, e.g. only the production build sets the Secure cookie flag.
const serverMode = isCI ? 'start' : 'dev'
process.env.E2E_SERVER_MODE = serverMode

// Refuses before anything starts if TEST_DATABASE_URL could be the normal database.
const testDatabase = assertWipeableTestDatabase(process.env)
const port = Number(process.env.E2E_DB_PORT ?? 3100)
const baseURL = `http://localhost:${port}`

if (!process.env.E2E_DB_IDENTITY_FILE) {
  console.log(`[e2e-db] Test database: ${describeDatabase(testDatabase)}`)
  // Before Playwright's own check, which waits forever on a hung server: an earlier test server
  // still running could write to the database after the reset.
  const problem = await previousServerProblem(port)
  if (problem) throw new Error(`[e2e-db] ${problem}`)
  // Set once in the runner; worker processes inherit them.
  process.env.E2E_DB_IDENTITY_FILE = path.join(os.tmpdir(), `ogserc-e2e-db-${process.pid}.json`)
  process.env.E2E_ADMIN_FILE = path.join(os.tmpdir(), `ogserc-e2e-admin-${process.pid}.json`)
  // Test uploads go to a throwaway folder, never the development media/ folder. Emptied here,
  // before the server starts, and again in global teardown.
  process.env.E2E_MEDIA_DIR = testMediaDir()
  emptyTestMediaDir(process.env.E2E_MEDIA_DIR)
  console.log(`[e2e-db] Test uploads folder: ${process.env.E2E_MEDIA_DIR}`)
}

export default defineConfig({
  testDir: './tests/e2e-db',
  forbidOnly: isCI,
  // Tests share one database, so they run one at a time and never retry over changed state.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: isCI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-db' }]] : 'list',
  globalSetup: './tests/e2e-db/global-setup.ts',
  globalTeardown: './tests/e2e-db/global-teardown.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    // Must run first, on the empty database. It creates the administrator the others sign in with.
    { name: 'first-user', testMatch: 'first-user.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'media', testMatch: 'media.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    { name: 'users', testMatch: 'users.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    { name: 'drafts', testMatch: 'drafts.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    { name: 'documents', testMatch: 'documents.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    { name: 'public-pages', testMatch: 'public-pages.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    { name: 'content-collections', testMatch: 'content-collections.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    {
      name: 'document-files',
      testMatch: 'document-files.spec.ts',
      dependencies: ['first-user'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'password-policy',
      testMatch: 'password-policy.spec.ts',
      dependencies: ['first-user'],
      use: { ...devices['Desktop Chrome'] },
    },
    { name: 'rate-limits', testMatch: 'rate-limits.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    { name: 'audit-log', testMatch: 'audit-log.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    { name: 'two-factor', testMatch: 'two-factor.spec.ts', dependencies: ['first-user'], use: { ...devices['Desktop Chrome'] } },
    {
      name: 'two-factor-reset',
      testMatch: 'two-factor-reset.spec.ts',
      dependencies: ['first-user', 'two-factor'],
      use: { ...devices['Desktop Chrome'] },
    },
    // Must run last: it demotes the run's administrator, leaving one administrator the others don't know.
    {
      name: 'last-admin',
      testMatch: 'last-admin.spec.ts',
      dependencies: ['first-user', 'media', 'users', 'drafts', 'password-policy', 'rate-limits', 'audit-log', 'two-factor', 'two-factor-reset'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // CI tests the production build; locally a dev server with its own build folder, so it never
    // clashes with a dev server you already have running. The wrapper refuses if an earlier test
    // server is still running, resets the database, starts the server, and writes its output
    // (secrets removed) to test-results/e2e-db-server.log.
    command: `node --experimental-strip-types tests/support/test-server.ts ${serverMode}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'pipe',
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      PROTECTED_DATABASE_URL: process.env.DATABASE_URL ?? '',
      E2E_DB_IDENTITY_FILE: process.env.E2E_DB_IDENTITY_FILE,
      MEDIA_DIR: process.env.E2E_MEDIA_DIR ?? testMediaDir(),
      PORT: String(port),
      // Deliberately written with a path and a trailing slash: the server must normalise it to the
      // origin (src/lib/env.ts siteOrigin), or the CSRF tests and every cookie sign-in would fail.
      SITE_URL: `${baseURL}/portal/`,
      // Tests never call Have I Been Pwned; the breach check has its own unit tests (D-053).
      PASSWORD_BREACH_CHECK: 'off',
      // Each sign-in helper sends its own made-up address here, so tests do not share one
      // sign-in limit; the rate-limit tests send a fixed one (D-081).
      CLIENT_IP_HEADER: 'X-Forwarded-For',
      // Local dev server only: build into .next-e2e (next.config.ts). CI uses the production build.
      ...(isCI ? {} : { E2E_TEST_SERVER: 'true' }),
    },
  },
})
