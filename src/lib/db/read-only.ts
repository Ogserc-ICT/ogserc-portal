// A connection string whose sessions are read-only: Postgres refuses every write, DDL statement
// and CREATE DATABASE on it. Used by db:verify, which may be pointed at production. No imports,
// so `node --experimental-strip-types` can load it directly.

export const READ_ONLY_OPTION = '-c default_transaction_read_only=on'

/** The same URL with the read-only option added to any `options` it already has. */
export function readOnlyConnectionString(url: string): string {
  const parsed = new URL(url)
  const existing = parsed.searchParams.get('options')?.trim()
  parsed.searchParams.set('options', existing ? `${existing} ${READ_ONLY_OPTION}` : READ_ONLY_OPTION)
  return parsed.toString()
}
