import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// E2E_TEST_COLLECTIONS registers test-only collections (src/collections/test). Production refuses
// it (src/lib/env.ts); this test makes sure nothing that builds, starts or deploys the site sets it.
// Only the migrate:create script (so migrations always include the test tables) and test code may.
// See docs/DECISIONS.md D-050.

const FLAG = 'E2E_TEST_COLLECTIONS'

/** Files and folders where the flag may be named. Everything else in the repository must not. */
const ALLOWED = [
  'package.json', // checked script by script below
  'src/lib/env.ts', // refuses it in production
  'src/collections/test/', // reads it
  'tests/', // test code that sets it for one `payload run` script, and this test
  'docs/', // documentation
  'CLAUDE.md',
  '.env.example', // documented as "never set this"
]

/** Must never name the flag: they build, start or deploy the site, or start the test servers. */
const NEVER = [
  'Dockerfile',
  'docker-compose.yml',
  '.github/workflows/ci.yml',
  'next.config.ts',
  'playwright.config.ts',
  'playwright.db.config.ts',
  'src/payload.config.ts',
]

const trackedFiles = (): string[] =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)

const isAllowed = (file: string): boolean =>
  ALLOWED.some((entry) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry))

test('the flag is named only where allowed', () => {
  const offenders = trackedFiles().filter((file) => {
    if (isAllowed(file) || /\.(png|jpe?g|webp|avif|ico|woff2?)$/i.test(file)) return false
    try {
      return readFileSync(file, 'utf8').includes(FLAG)
    } catch {
      return false // deleted in the working tree
    }
  })
  expect(offenders).toEqual([])
})

test('files that build, start or deploy the site never name it', () => {
  for (const file of NEVER) expect(readFileSync(file, 'utf8').includes(FLAG), file).toBe(false)
})

test('only migrate:create sets it in package.json', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }
  const setters = Object.entries(pkg.scripts)
    .filter(([, command]) => command.includes(FLAG))
    .map(([name]) => name)
  expect(setters).toEqual(['migrate:create'])
  // generate:types too: Payload rewrites payload-types.ts on every development start, without the
  // flag, so the committed types describe the deployed config.
  for (const name of ['build', 'start', 'dev', 'migrate', 'generate:types']) {
    expect(pkg.scripts[name]).not.toContain(FLAG)
  }
  // Nowhere else in package.json either (config sections, engines, ...).
  const { scripts: _scripts, ...rest } = pkg
  expect(JSON.stringify(rest)).not.toContain(FLAG)
})
