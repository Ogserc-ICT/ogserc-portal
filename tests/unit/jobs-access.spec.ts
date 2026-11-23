import { expect, test } from '@playwright/test'

import { hasJobsSecret, jobsAccess } from '../../src/lib/jobs/run-access'
import { checkServerEnv } from '../../src/lib/env'
import { portalConfig } from '../../src/payload.config'

// Scheduled publishing's job runner (D-090): only the server's cron job, with JOBS_RUN_SECRET.

const SECRET = 's'.repeat(40)
const req = (authorization?: string, user?: unknown) =>
  ({ headers: new Headers(authorization ? { authorization } : {}), user }) as never

test('the runner needs the exact secret as a bearer token', () => {
  expect(hasJobsSecret(req(`Bearer ${SECRET}`), SECRET)).toBe(true)
  expect(hasJobsSecret(req(`Bearer ${SECRET}`), ` ${SECRET}\n`)).toBe(true) // .env whitespace
  for (const header of [undefined, SECRET, `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, `bearer ${SECRET}`, `JWT ${SECRET}`]) {
    expect(hasJobsSecret(req(header), SECRET), String(header)).toBe(false)
  }
})

test('without a secret, or with a short one, nobody may run jobs', () => {
  expect(hasJobsSecret(req('Bearer '), '')).toBe(false)
  expect(hasJobsSecret(req('Bearer undefined'), undefined)).toBe(false)
  expect(hasJobsSecret(req(`Bearer ${'s'.repeat(31)}`), 's'.repeat(31))).toBe(false)
})

test('a signed-in administrator without the secret may not run or queue jobs; only administrators cancel', () => {
  const admin = { id: 1, collection: 'users', roles: ['administrator'] }
  const editor = { id: 2, collection: 'users', roles: ['editor'] }
  expect(jobsAccess.run({ req: req(undefined, admin) })).toBe(false)
  expect(jobsAccess.queue()).toBe(false)
  expect(jobsAccess.cancel({ req: req(undefined, admin) })).toBe(true)
  expect(jobsAccess.cancel({ req: req(undefined, editor) })).toBe(false)
})

// Until Step 4's real collections exist, only the test collection schedules publishing.
test('the config uses these rules, not Payload’s “any signed-in user” defaults', async () => {
  const config = await portalConfig({ withTestCollections: true })
  expect(config.jobs.access?.run).toBe(jobsAccess.run)
  expect(config.jobs.access?.queue).toBe(jobsAccess.queue)
  expect(config.jobs.access?.cancel).toBe(jobsAccess.cancel)
  expect(config.jobs.tasks?.map((task) => task.slug)).toContain('schedulePublish')
})

test('the startup check: a short secret stops the server; none in production is a warning', () => {
  const base = { DATABASE_URL: 'postgres://x', PAYLOAD_SECRET: 'p'.repeat(32) }
  expect(checkServerEnv({ ...base, JOBS_RUN_SECRET: 'short' }).errors).toContain('JOBS_RUN_SECRET must be at least 32 characters.')
  expect(checkServerEnv({ ...base, JOBS_RUN_SECRET: SECRET }).errors).toEqual([])
  const production = { ...base, NODE_ENV: 'production', SITE_URL: 'https://example.org', CLIENT_IP_HEADER: 'X-Forwarded-For', MEDIA_STORAGE: 'local' }
  expect(checkServerEnv(production).warnings).toContain('JOBS_RUN_SECRET is not set: scheduled publishing will not run (D-090).')
  expect(checkServerEnv({ ...production, JOBS_RUN_SECRET: SECRET }).warnings).toEqual([])
})
