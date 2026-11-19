import { expect, test } from '@playwright/test'

import { checkSchema } from '../../src/lib/db/verify-schema'

const EXPECTED = {
  tables: ['users', 'media', 'payload_migrations'],
  migrations: ['20261008_211615_initial', '20261018_173528_e2e_drafts'],
}

test.describe('database schema check', () => {
  test('a database with everything expected, and more, has no problems', () => {
    expect(checkSchema(EXPECTED, [...EXPECTED.tables, 'e2e_drafts'], [...EXPECTED.migrations, 'later'])).toEqual([])
  })

  test('names every missing table and unrecorded migration', () => {
    expect(checkSchema(EXPECTED, ['users'], ['20261008_211615_initial'])).toEqual([
      'Missing tables: media, payload_migrations.',
      'Migrations not recorded: 20261018_173528_e2e_drafts.',
    ])
  })

  test('an empty expectation is itself a failure', () => {
    expect(checkSchema({ tables: [], migrations: [] }, [], [])).toContain('No expected tables were given.')
  })

  test('messages hold only the names it was given', () => {
    const problems = checkSchema(EXPECTED, [], [])
    const allowed = new Set([...EXPECTED.tables, ...EXPECTED.migrations])
    for (const problem of problems) {
      const names = problem.replace(/^(Missing tables|Migrations not recorded): /, '').replace(/\.$/, '').split(', ')
      for (const name of names) expect(allowed.has(name), `${name} in "${problem}"`).toBe(true)
    }
  })
})
