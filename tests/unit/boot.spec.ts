import { readFileSync } from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'
import type { Payload } from 'payload'

import { classifyStartError, MAX_ATTEMPTS, REFUSALS, SchemaIncompleteError, startWithRetry } from '../../src/lib/boot'
import { checkDatabaseAtStartup } from '../../src/lib/startup'
import { migrations } from '../../src/migrations'
import { fakeDatabaseUrl } from '../support/fakes'

// How a production server starts (D-051): an incomplete schema stops it at once, a database that is
// briefly unreachable is waited for, and no message ever repeats a URL, user name or password.

const URL_WITH_SECRETS = fakeDatabaseUrl('ep-prod.example.neon.tech', 'neondb', '?sslmode=require')
const SECRETS = (() => {
  const url = new URL(URL_WITH_SECRETS)
  return [URL_WITH_SECRETS, url.username, url.password, 'postgres://']
})()

/** Errors shaped like Payload's, carrying credentials, to prove they are never echoed. */
const unreachable = () => new Error(`Error: cannot connect to Postgres: connect ECONNREFUSED (${URL_WITH_SECRETS})`)
const missing = () =>
  new Error(`Error: cannot connect to Postgres: database "neondb" does not exist (user "${new URL(URL_WITH_SECRETS).username}")`)
const other = () => new Error(`Something else broke near ${URL_WITH_SECRETS}`)

function run(outcomes: (Error | 'ok')[]) {
  const logs: string[] = []
  const waits: number[] = []
  const exits: number[] = []
  let attempts = 0
  const done = startWithRetry({
    start: async () => {
      const outcome = outcomes[Math.min(attempts++, outcomes.length - 1)]
      if (outcome !== 'ok') throw outcome
    },
    sleep: async (ms) => void waits.push(ms),
    log: (message) => void logs.push(message),
    exit: (code) => void exits.push(code),
  })
  return { done, logs, waits, exits, attempts: () => attempts }
}

function expectNoSecrets(lines: string[]) {
  for (const line of lines) for (const secret of SECRETS) expect(line).not.toContain(secret)
}

test.describe('starting at boot', () => {
  test('an incomplete schema stops the server at once, without retrying', async () => {
    const r = run([new SchemaIncompleteError()])
    expect(await r.done).toBe(false)
    expect(r.attempts()).toBe(1)
    expect(r.exits).toEqual([1])
    expect(r.logs).toEqual([REFUSALS['schema-incomplete']])
  })

  test('a brief outage is waited out', async () => {
    const r = run([unreachable(), unreachable(), 'ok'])
    expect(await r.done).toBe(true)
    expect(r.attempts()).toBe(3)
    expect(r.waits).toEqual([1000, 2000])
    expect(r.exits).toEqual([])
    expect(r.logs).toEqual([
      `Database not reachable (attempt 1 of ${MAX_ATTEMPTS}); retrying in 1s.`,
      `Database not reachable (attempt 2 of ${MAX_ATTEMPTS}); retrying in 2s.`,
      `Database reachable; started on attempt 3 of ${MAX_ATTEMPTS}.`,
    ])
    expectNoSecrets(r.logs)
  })

  test('a database that stays unreachable stops the server after six attempts, about 30 s', async () => {
    const r = run([unreachable()])
    expect(await r.done).toBe(false)
    expect(r.attempts()).toBe(MAX_ATTEMPTS)
    expect(r.waits).toEqual([1000, 2000, 4000, 8000, 15000])
    expect(r.exits).toEqual([1])
    expect(r.logs.at(-1)).toBe(REFUSALS['database-unreachable'])
    expectNoSecrets(r.logs)
  })

  test('a missing database stops the server at once', async () => {
    const r = run([missing()])
    expect(await r.done).toBe(false)
    expect(r.attempts()).toBe(1)
    expect(r.logs).toEqual([REFUSALS['database-missing']])
    expectNoSecrets(r.logs)
  })

  test('any other start-up error stops the server at once', async () => {
    const r = run([other()])
    expect(await r.done).toBe(false)
    expect(r.attempts()).toBe(1)
    expect(r.logs).toEqual([REFUSALS.other])
    expectNoSecrets(r.logs)
  })

  test('errors are classified by Payload\'s message and by code, not by class', () => {
    expect(classifyStartError({ code: 'SCHEMA_INCOMPLETE' })).toBe('schema-incomplete')
    expect(classifyStartError(unreachable())).toBe('database-unreachable')
    expect(classifyStartError(missing())).toBe('database-missing')
    expect(classifyStartError(other())).toBe('other')
    expect(classifyStartError(undefined)).toBe('other')
  })

  test('no fixed message contains a URL, user name or password', () => {
    expectNoSecrets(Object.values(REFUSALS))
    for (const message of Object.values(REFUSALS)) expect(message).not.toMatch(/:\/\/|@/)
  })
})

test.describe('the boot-time start', () => {
  // The instrumentation bundle has its own copy of Payload. An instance it created through
  // getPayload's process-wide cache served every request, and Payload's error responses lost
  // their details (D-051, part 4). The boot check must use its own instance and close it.
  const source = readFileSync(path.resolve('src/instrumentation-node.ts'), 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '')

  test('never calls getPayload', () => {
    expect(source).not.toMatch(/getPayload/)
  })

  test('uses its own instance and destroys it, also after a failure', () => {
    expect(source).toMatch(/new BasePayload\(\)/)
    expect(source).toMatch(/finally\s*\{[^}]*\.destroy\(\)/)
  })
})

/** A Payload stand-in: the database answers the schema queries in order (tables, then migrations). */
function fakePayload(tables: string[], recorded: string[], users = 1) {
  const errors: string[] = []
  const answers = [tables, recorded]
  const payload = {
    db: {
      tables: Object.fromEntries(['users', 'media', 'payload_migrations'].map((name) => [name, {}])),
      drizzle: { execute: async () => ({ rows: (answers.shift() ?? []).map((name) => ({ name })) }) },
    },
    logger: { error: (message: string) => void errors.push(message), info: () => {} },
    count: async () => ({ totalDocs: users }),
  }
  return { payload: payload as unknown as Payload, errors }
}

const ALL_MIGRATIONS = migrations.map((migration) => migration.name)

test.describe('the startup check', () => {
  test('passes a complete database', async () => {
    const { payload, errors } = fakePayload(['users', 'media', 'payload_migrations', 'e2e_drafts'], ALL_MIGRATIONS)
    await checkDatabaseAtStartup(payload)
    expect(errors).toEqual([])
  })

  test('refuses an incomplete one with one ERROR line naming only what is missing', async () => {
    const { payload, errors } = fakePayload(['users', 'payload_migrations'], ALL_MIGRATIONS.slice(1))
    const thrown = await checkDatabaseAtStartup(payload).catch((error: unknown) => error)
    expect(classifyStartError(thrown)).toBe('schema-incomplete')
    expect(errors).toEqual([
      `Database check failed: Missing tables: media. Migrations not recorded: ${ALL_MIGRATIONS.slice(0, 1).join(', ')}.`,
    ])
  })

  test('warns when there are no user accounts', async () => {
    const { payload, errors } = fakePayload(['users', 'media', 'payload_migrations'], ALL_MIGRATIONS, 0)
    await checkDatabaseAtStartup(payload)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/^SECURITY: there are no user accounts/)
  })
})
