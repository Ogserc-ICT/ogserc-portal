// Checks that a database has every table and migration record the code expects. Used after a
// test-database reset (tests/support/reset-steps.ts). Messages hold only table and migration names.

/** What a complete database must contain. */
export type ExpectedSchema = { tables: string[]; migrations: string[] }

/** Problems with the database; empty when it has everything expected. */
export function checkSchema(expected: ExpectedSchema, tables: string[], migrations: string[]): string[] {
  const problems: string[] = []
  const missingTables = expected.tables.filter((name) => !tables.includes(name))
  const missingMigrations = expected.migrations.filter((name) => !migrations.includes(name))
  if (expected.tables.length === 0) problems.push('No expected tables were given.')
  if (missingTables.length > 0) problems.push(`Missing tables: ${missingTables.join(', ')}.`)
  if (missingMigrations.length > 0) problems.push(`Migrations not recorded: ${missingMigrations.join(', ')}.`)
  return problems
}
