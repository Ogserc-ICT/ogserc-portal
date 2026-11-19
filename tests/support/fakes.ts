// Fake credentials for tests, built at run time from random bytes, so the source contains no
// literal that looks like a real password, token, key or connection string (the secret scan in CI
// rightly flags those). None of these values can work anywhere.

import { createHmac, randomBytes } from 'node:crypto'

/** A random, obviously fake secret: "fake-" plus hex. */
export function fakeSecret(bytes = 16): string {
  return `fake-${randomBytes(bytes).toString('hex')}`
}

/** A Postgres URL for the given host and database, with a fake user and a random password. */
export function fakeDatabaseUrl(host: string, database: string, query = ''): string {
  return `postgres://fake-user:${fakeSecret(6)}@${host}/${database}${query}`
}

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** A well-formed HS256 JWT signed with a random key that is thrown away, so it verifies nowhere. */
export function fakeJwt(): string {
  const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ id: fakeSecret(4) })}`
  return `${unsigned}.${createHmac('sha256', randomBytes(32)).update(unsigned).digest('base64url')}`
}
