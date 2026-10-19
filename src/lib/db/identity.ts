// Which database a connection string or live connection points at, described by host and database
// name only, never the user, password or query string. Shared by the server (startup checks) and
// the test harness. No imports, so `node --experimental-strip-types` can load it directly.

export type DatabaseIdentity = { host: string; database: string }

/** Host (with port, if given) and database name from a Postgres URL, or null if it cannot be read. */
export function databaseIdentity(url: string | undefined): DatabaseIdentity | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
    if (!parsed.hostname || !database) return null
    return { host: parsed.host.toLowerCase(), database }
  } catch {
    return null
  }
}

export function sameDatabase(a: DatabaseIdentity, b: DatabaseIdentity): boolean {
  return a.host === b.host && a.database === b.database
}

export function describeDatabase(identity: DatabaseIdentity | null): string {
  return identity ? `host ${identity.host}, database ${identity.database}` : 'unknown database'
}
