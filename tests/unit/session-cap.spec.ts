import { expect, test } from '@playwright/test'

import { mayRefreshSession, SESSION_LIMIT_HOURS } from '../../src/lib/auth/session-cap'

// The 12-hour session limit (Step 3 plan, D-052). The database test refreshes real sessions whose
// start was moved back (tests/e2e-db/users.spec.ts, "sessions and cookies").

const HOUR = 3600 * 1000
const TOKEN = 3600 // seconds, as in Users.ts
const now = new Date('2026-10-20T12:00:00.000Z')
const startedAgo = (ms: number) => new Date(now.getTime() - ms)

test('the limit is 12 hours', () => {
  expect(SESSION_LIMIT_HOURS).toBe(12)
})

test('a refresh is allowed while the new token would end before 12 hours', () => {
  for (const age of [0, HOUR, 10 * HOUR, 11 * HOUR - 1000]) {
    expect(mayRefreshSession(startedAgo(age), now, TOKEN), `${age / HOUR} h`).toBe(true)
  }
})

test('a refresh is refused once the new token would reach or pass 12 hours', () => {
  for (const age of [11 * HOUR, 11.5 * HOUR, 12 * HOUR, 30 * HOUR]) {
    expect(mayRefreshSession(startedAgo(age), now, TOKEN), `${age / HOUR} h`).toBe(false)
  }
})

test('the start time is read as a Date or an ISO string, as the database returns it', () => {
  expect(mayRefreshSession(startedAgo(HOUR).toISOString(), now, TOKEN)).toBe(true)
  expect(mayRefreshSession(startedAgo(11.5 * HOUR).toISOString(), now, TOKEN)).toBe(false)
})

test('a missing or unreadable start time is refused', () => {
  for (const createdAt of [undefined, null, '', 'yesterday', 0, {}]) {
    expect(mayRefreshSession(createdAt, now, TOKEN), JSON.stringify(createdAt)).toBe(false)
  }
})

test('a session started in the future is still capped from its start', () => {
  // A clock change cannot extend it: the end is always start + 12 hours.
  expect(mayRefreshSession(new Date(now.getTime() + HOUR), now, TOKEN)).toBe(true)
  expect(mayRefreshSession(new Date(now.getTime() + HOUR), new Date(now.getTime() + 12 * HOUR), TOKEN)).toBe(false)
})
