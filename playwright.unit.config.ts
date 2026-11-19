import { defineConfig } from '@playwright/test'
import 'dotenv/config'

// Fast tests of pure functions and the assembled Payload config. They use Playwright's test
// runner (D-006: no separate unit-test framework), never open a browser, start no server and
// touch no database.
export default defineConfig({
  testDir: './tests/unit',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'list' : 'line',
})
