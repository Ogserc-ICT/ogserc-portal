import { expect, test } from '@playwright/test'
import { APIError } from 'payload'

import { guardTotpEndpoint, guardTotpEndpoints, MIN_SECRET_BITS, secretBits, TOTP_MESSAGES, TOTP_PATHS } from '../../src/lib/auth/two-factor'

// The guards around payload-totp's endpoints, with a fake plugin handler and limiter (D-084). The
// database tests run the real plugin (tests/e2e-db/two-factor.spec.ts).

process.env.CLIENT_IP_HEADER = 'X-Forwarded-For'

const SECRET_32 = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' // 32 base32 characters = 160 bits

function fakeReq(body: unknown, user: unknown = { id: 7, email: 'kemi@example.org', collection: 'users' }) {
  const written: Record<string, unknown>[] = []
  const req = {
    user,
    headers: new Headers({ 'x-forwarded-for': '203.0.113.5' }),
    json: async () => body,
    payload: { logger: { error: () => {} }, create: async ({ data }: { data: Record<string, unknown> }) => void written.push(data) },
  }
  return { req: req as never, written, raw: req as { json: () => Promise<unknown> } }
}

/** A limiter whose `consume` refuses when `limited`, and whose `first` remembers what it has seen. */
function fakeLimiter({ limited = false } = {}) {
  const seen = new Set<string>()
  return () => ({
    consume: async () => {
      if (limited) throw new APIError('Too many attempts. Try again in 15 minutes.', 429, undefined, true)
    },
    check: async () => {},
    record: async () => {},
    first: async (_rule: string, value: string) => {
      const isFirst = !seen.has(value)
      seen.add(value)
      return isFirst
    },
  })
}

/** The plugin's handler stand-in: answers `{ ok }` with 200, as the plugin does, and records that it ran. */
function plugin(ok: boolean) {
  const calls: unknown[] = []
  const handler = async (req: { json: () => Promise<unknown> }) => {
    calls.push(await req.json())
    return Response.json({ ok, ...(ok ? {} : { message: 'The code is incorrect.' }) })
  }
  return { handler: handler as never, calls }
}

const actions = (written: Record<string, unknown>[]) => written.map((row) => [row.action, row.details])

test('secretBits counts 5 bits per base32 character and refuses anything else', () => {
  expect(secretBits(SECRET_32)).toBe(MIN_SECRET_BITS)
  expect(secretBits(`${SECRET_32}====`)).toBe(160)
  expect(secretBits(SECRET_32.toLowerCase())).toBe(160)
  for (const value of ['', 'ABC1', 'JBSWY3DP!', 42, undefined]) expect(secretBits(value), String(value)).toBe(0)
})

test('a correct code reaches the plugin once, is audited, and cannot be used again', async () => {
  const { handler, calls } = plugin(true)
  const guarded = guardTotpEndpoint('verify', handler, fakeLimiter() as never)
  const first = fakeReq({ token: '123456' })
  expect(((await (await guarded(first.req)).json()) as { ok: boolean }).ok).toBe(true)
  const again = fakeReq({ token: '123456' })
  const reused = await guarded(again.req)
  expect(reused.status).toBe(400)
  expect(await reused.json()).toEqual({ ok: false, message: TOTP_MESSAGES.reused })
  expect(calls).toEqual([{ token: '123456' }])
  expect(actions(first.written)).toEqual([['2fa.verified', { via: 'verify' }]])
  expect(actions(again.written)).toEqual([['2fa.failed', { reason: 'code already used', via: 'verify' }]])
})

test('a wrong code is audited as refused and the plugin answer is passed on', async () => {
  const { handler } = plugin(false)
  const { req, written } = fakeReq({ token: '000000' })
  const response = await guardTotpEndpoint('verify', handler, fakeLimiter() as never)(req)
  expect(((await response.json()) as { ok: boolean }).ok).toBe(false)
  expect(actions(written)).toEqual([['2fa.failed', { reason: 'wrong code', via: 'verify' }]])
})

test('over the address limit: 429 with the limit message, and the plugin is not called', async () => {
  const { handler, calls } = plugin(true)
  const { req, written } = fakeReq({ token: '123456' })
  const response = await guardTotpEndpoint('verify', handler, fakeLimiter({ limited: true }) as never)(req)
  expect(response.status).toBe(429)
  expect(((await response.json()) as { message: string }).message).toMatch(/^Too many attempts/)
  expect(calls).toEqual([])
  expect(actions(written)).toEqual([['2fa.failed', { reason: 'too many attempts', via: 'verify' }]])
})

test('set-up refuses a secret under 160 bits before the plugin sees it, and records a good one', async () => {
  const { handler, calls } = plugin(true)
  const guarded = guardTotpEndpoint('setup', handler, fakeLimiter() as never)
  const weak = fakeReq({ token: '123456', secret: 'JBSWY3DPEHPK3PXP' })
  const refused = await guarded(weak.req)
  expect(await refused.json()).toEqual({ ok: false, message: TOTP_MESSAGES.weakSecret })
  expect(calls).toEqual([])
  const good = fakeReq({ token: '654321', secret: SECRET_32 })
  expect(((await (await guarded(good.req)).json()) as { ok: boolean }).ok).toBe(true)
  expect(actions(good.written)).toEqual([['2fa.enrolled', { via: 'setup' }]])
})

test('a request without a staff session goes straight to the plugin, which refuses it', async () => {
  const { handler, calls } = plugin(false)
  const { req, written } = fakeReq({ token: '123456' }, null)
  await guardTotpEndpoint('verify', handler, fakeLimiter({ limited: true }) as never)(req)
  expect(calls).toHaveLength(1)
  expect(written).toEqual([])
})

test("guardTotpEndpoints wraps the plugin's three endpoints and fails loudly if one is missing", () => {
  const endpoint = (path: string) => ({ path, method: 'post' as const, handler: async () => Response.json({}) })
  const all = Object.values(TOTP_PATHS).map(endpoint)
  const other = endpoint('/something-else')
  const { endpoints } = guardTotpEndpoints({ endpoints: [...all, other] } as never)
  expect(endpoints!.slice(0, 3).every((e, n) => e.handler !== all[n]!.handler)).toBe(true)
  expect(endpoints![3]).toBe(other)
  expect(() => guardTotpEndpoints({ endpoints: all.slice(0, 2) } as never)).toThrow(/expected its 3 endpoints, found 2/)
})
