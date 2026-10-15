import { expect, test } from '@playwright/test'

import { checkResetResult, type ResetOperations, resetAndVerify } from '../support/reset-steps'

const TARGET = { host: 'ep-test.example.neon.tech', database: 'ogserc_e2e' }
const EXPECTED = { tables: ['users', 'media', 'payload_migrations'], migrations: ['20261008_211615_initial'] }

/** A mocked connection that records which operations ran. */
function mockConnection(overrides: Partial<ResetOperations> = {}) {
  const calls: string[] = []
  const operations: ResetOperations = {
    liveDatabase: async () => TARGET,
    resetSchema: async () => void calls.push('resetSchema'),
    migrate: async () => void calls.push('migrate'),
    existingTables: async () => [...EXPECTED.tables, 'users_roles'],
    appliedMigrations: async () => [...EXPECTED.migrations],
    ...overrides,
  }
  return { calls, operations }
}

const quiet = () => {}

test.describe('test database reset', () => {
  test('aborts without changing anything when the live connection reports another database', async () => {
    const { calls, operations } = mockConnection({
      liveDatabase: async () => ({ host: TARGET.host, database: 'neondb' }),
    })
    await expect(resetAndVerify(TARGET, operations, EXPECTED, quiet)).rejects.toThrow(
      /live connection is host ep-test.example.neon.tech, database neondb.*Nothing was changed/,
    )
    expect(calls).toEqual([])
  })

  test('aborts without changing anything when the live connection is on another host', async () => {
    const { calls, operations } = mockConnection({
      liveDatabase: async () => ({ host: 'ep-dev.example.neon.tech', database: TARGET.database }),
    })
    await expect(resetAndVerify(TARGET, operations, EXPECTED, quiet)).rejects.toThrow(/Nothing was changed/)
    expect(calls).toEqual([])
  })

  test('resets then migrates when the live connection is the target', async () => {
    const { calls, operations } = mockConnection()
    await resetAndVerify(TARGET, operations, EXPECTED, quiet)
    expect(calls).toEqual(['resetSchema', 'migrate'])
  })

  test('fails when a table is missing after the migrations', async () => {
    const { operations } = mockConnection({ existingTables: async () => ['users', 'payload_migrations'] })
    await expect(resetAndVerify(TARGET, operations, EXPECTED, quiet)).rejects.toThrow(/Missing tables: media/)
  })

  test('fails when a migration was not recorded', async () => {
    const { operations } = mockConnection({ appliedMigrations: async () => [] })
    await expect(resetAndVerify(TARGET, operations, EXPECTED, quiet)).rejects.toThrow(
      /Migrations not recorded: 20261008_211615_initial/,
    )
  })

  test('an empty expectation is itself a failure', () => {
    expect(checkResetResult({ tables: [], migrations: [] }, [], [])).toContain('No expected tables were given.')
  })
})
