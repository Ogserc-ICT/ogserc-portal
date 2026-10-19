import { expect, test } from '@playwright/test'

import { databaseIdentity, describeDatabase } from '../../src/lib/db/identity'
import { fakeSecret } from '../support/fakes'

// describeDatabase is what every log line and error message uses to name a database, so whatever
// connection string it is given, the output must never carry credentials or the URL itself.
// URLs are built at run time from random values (tests/support/fakes.ts).

type Case = { label: string; url: string | undefined; secrets: string[] }

function cases(): Case[] {
  const user = `user-${fakeSecret(3)}`
  const password = fakeSecret(8)
  const queryValue = fakeSecret(5)
  const scheme = ['postgres', '://'].join('')
  const withCredentials = (host: string, rest = '/ogserc') => `${scheme}${user}:${password}@${host}${rest}`
  const secrets = [user, password, queryValue]
  return [
    { label: 'user and password', url: withCredentials('ep-dev.example.neon.tech'), secrets },
    { label: 'port', url: withCredentials('localhost:5432'), secrets },
    { label: 'upper-case host', url: withCredentials('EP-DEV.Example.Neon.Tech'), secrets },
    { label: 'IPv6 host', url: withCredentials('[::1]:5432'), secrets },
    {
      label: 'query string',
      url: withCredentials('ep-dev.example.neon.tech', `/neondb?sslmode=require&password=${queryValue}`),
      secrets,
    },
    {
      label: 'options parameter',
      url: withCredentials('ep-dev.example.neon.tech', `/neondb?options=-c%20search_path%3D${queryValue}`),
      secrets,
    },
    {
      label: 'percent-encoded @ in the password',
      url: `${scheme}${user}:${encodeURIComponent(`${password}@x`)}@ep-dev.example.neon.tech/neondb`,
      secrets,
    },
    {
      label: 'literal @ in the password',
      url: `${scheme}${user}:${password}@x@ep-dev.example.neon.tech/neondb`,
      secrets,
    },
    { label: 'user only', url: `${scheme}${user}@ep-dev.example.neon.tech/neondb`, secrets },
    { label: 'no database name', url: withCredentials('ep-dev.example.neon.tech', '/'), secrets },
    { label: 'no host', url: `${scheme}${user}:${password}@/neondb`, secrets },
    { label: 'not a URL', url: `${user}:${password} not a url`, secrets },
    { label: 'empty', url: '', secrets },
    { label: 'missing', url: undefined, secrets },
  ]
}

const SHAPE = /^(host [^\s@/?=]+, database [^\s@/?=]+|unknown database)$/

test.describe('database descriptions', () => {
  for (const { label, url, secrets } of cases()) {
    test(`never include credentials or the URL: ${label}`, () => {
      const description = describeDatabase(databaseIdentity(url))
      for (const secret of secrets) expect(description).not.toContain(secret)
      for (const fragment of ['postgres', '://', '@', '?', 'sslmode', 'password', 'options']) {
        expect(description).not.toContain(fragment)
      }
      expect(description).toMatch(SHAPE)
    })
  }

  test('name only the host and database', () => {
    const url = `${['postgres', '://'].join('')}u-${fakeSecret(2)}:${fakeSecret(4)}@EP-Dev.example.neon.tech:5432/neondb?sslmode=require`
    expect(describeDatabase(databaseIdentity(url))).toBe('host ep-dev.example.neon.tech:5432, database neondb')
    expect(describeDatabase(null)).toBe('unknown database')
  })
})
