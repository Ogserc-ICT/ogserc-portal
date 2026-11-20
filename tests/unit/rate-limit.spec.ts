import { expect, test } from '@playwright/test'
import { APIError } from 'payload'

import {
  clientAddress,
  countFailedLogin,
  limiter,
  rateKey,
  rateLimitAuth,
  rateLimitReply,
  RULES,
  type Store,
  tooManyMessage,
  type Window,
} from '../../src/lib/auth/rate-limit'

// The rate limiter with an in-memory store and a fixed clock (D-081). The database tests check the
// Postgres store and the replies through Payload (tests/e2e-db/rate-limits.spec.ts).

const SECRET = 'unit-test-secret-not-a-real-one-32-chars'
const START = new Date('2026-11-20T10:00:00Z')

/** Fixed-window store on a Map, with a clock the test moves. */
function memoryStore() {
  let now = START
  const windows = new Map<string, Window>()
  let sweeps = 0
  const store: Store = {
    async hit(key, windowSeconds) {
      const current = windows.get(key)
      const next =
        current && current.resetAt > now
          ? { count: current.count + 1, resetAt: current.resetAt }
          : { count: 1, resetAt: new Date(now.getTime() + windowSeconds * 1000) }
      windows.set(key, next)
      return next
    },
    async peek(key) {
      const current = windows.get(key)
      return current && current.resetAt > now ? current : undefined
    },
    async sweep() {
      sweeps++
      for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key)
    },
  }
  return {
    store,
    windows,
    sweeps: () => sweeps,
    clock: () => now,
    advance: (seconds: number) => (now = new Date(now.getTime() + seconds * 1000)),
  }
}

function fakeReq(overrides: Record<string, unknown> = {}) {
  const errors: unknown[] = []
  const req = {
    payload: { secret: SECRET, config: { routes: { api: '/api' } }, logger: { error: (m: unknown) => errors.push(m) } },
    payloadAPI: 'REST',
    headers: new Headers({ 'x-forwarded-for': '203.0.113.7' }),
    method: 'POST',
    url: 'http://localhost:3000/api/users/login',
    ...overrides,
  }
  return { req: req as never, errors, raw: req as { responseHeaders?: Headers } }
}

async function refusal(promise: Promise<unknown>): Promise<APIError> {
  const error = await promise.then(
    () => undefined,
    (caught: unknown) => caught,
  )
  expect(error, 'expected a 429').toBeInstanceOf(APIError)
  return error as APIError
}

test.describe('client address', () => {
  const env = { CLIENT_IP_HEADER: 'X-Forwarded-For' }

  test('the last entry is used: earlier ones come from the visitor and can be made up', () => {
    expect(clientAddress(new Headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }), env)).toBe('203.0.113.7')
    expect(clientAddress(new Headers({ 'x-forwarded-for': ' 2001:DB8::1 ' }), env)).toBe('2001:db8::1')
  })

  test('a missing setting, header or invalid value gives the shared "unknown" bucket', () => {
    expect(clientAddress(new Headers({ 'x-forwarded-for': '203.0.113.7' }), {})).toBe('unknown')
    expect(clientAddress(new Headers(), env)).toBe('unknown')
    for (const value of ['not-an-ip', '203.0.113.7, evil', '', '999.1.1.1']) {
      expect(clientAddress(new Headers({ 'x-forwarded-for': value }), env), value).toBe('unknown')
    }
  })
})

test('keys are HMACs: the same input gives the same key, and no input appears in it', () => {
  const key = rateKey('loginEmail', 'kemi.bello@example.org', SECRET)
  expect(key).toMatch(/^[0-9a-f]{64}$/)
  expect(key).toBe(rateKey('loginEmail', 'kemi.bello@example.org', SECRET))
  expect(key).not.toBe(rateKey('forgotEmail', 'kemi.bello@example.org', SECRET))
  expect(key).not.toBe(rateKey('loginEmail', 'kemi.bello@example.org', `${SECRET}x`))
})

test.describe('limiter', () => {
  test('allows the limit, refuses the next with 429 and Retry-After, and starts again after the window', async () => {
    const memory = memoryStore()
    const { req, raw } = fakeReq()
    const limits = limiter(req, { store: memory.store, now: memory.clock, random: () => 1 })
    for (let n = 1; n <= RULES.loginIp.limit; n++) await limits.consume('loginIp', '203.0.113.7')
    const error = await refusal(limits.consume('loginIp', '203.0.113.7'))
    expect(error.status).toBe(429)
    expect(error.message).toBe(tooManyMessage(15))
    expect(error.isPublic).toBe(true)
    expect(raw.responseHeaders?.get('Retry-After')).toBe(String(RULES.loginIp.windowSeconds))

    memory.advance(14 * 60)
    expect((await refusal(limits.consume('loginIp', '203.0.113.7'))).message).toBe(tooManyMessage(1))
    memory.advance(60)
    await limits.consume('loginIp', '203.0.113.7')
  })

  test('addresses, emails and rules are counted separately', async () => {
    const memory = memoryStore()
    const limits = limiter(fakeReq().req, { store: memory.store, now: memory.clock, random: () => 1 })
    for (let n = 1; n <= RULES.forgotEmail.limit; n++) await limits.consume('forgotEmail', 'a@example.org')
    await refusal(limits.consume('forgotEmail', 'a@example.org'))
    await limits.consume('forgotEmail', 'b@example.org')
    await limits.consume('forgotIp', 'a@example.org')
  })

  test('check refuses at the limit without counting; record counts without refusing', async () => {
    const memory = memoryStore()
    const limits = limiter(fakeReq().req, { store: memory.store, now: memory.clock, random: () => 1 })
    for (let n = 1; n < RULES.loginEmail.limit; n++) await limits.record('loginEmail', 'a@example.org')
    for (let n = 0; n < 5; n++) await limits.check('loginEmail', 'a@example.org')
    expect([...memory.windows.values()][0]!.count).toBe(RULES.loginEmail.limit - 1)
    await limits.record('loginEmail', 'a@example.org')
    await limits.record('loginEmail', 'a@example.org')
    await refusal(limits.check('loginEmail', 'a@example.org'))
  })

  test('ended windows are swept on about one request in 20', async () => {
    for (const [random, swept] of [[0.01, 1], [0.5, 0]] as const) {
      const memory = memoryStore()
      await limiter(fakeReq().req, { store: memory.store, random: () => random }).consume('loginIp', 'x')
      expect(memory.sweeps(), String(random)).toBe(swept)
    }
  })
})

test.describe('hooks', () => {
  /** A limiter that records what each hook asked for. */
  function spy() {
    const calls: string[] = []
    const make = () => ({
      consume: async (rule: string, value: string) => void calls.push(`consume ${rule} ${value}`),
      check: async (rule: string, value: string) => void calls.push(`check ${rule} ${value}`),
      record: async (rule: string, value: string) => void calls.push(`record ${rule} ${value}`),
    })
    return { calls, make }
  }
  const env = process.env.CLIENT_IP_HEADER
  test.beforeAll(() => void (process.env.CLIENT_IP_HEADER = 'X-Forwarded-For'))
  test.afterAll(() => void (process.env.CLIENT_IP_HEADER = env))

  const run = (operation: string, data: unknown, req: unknown, make: () => unknown) =>
    rateLimitAuth(make as never)({ args: { data }, operation, req } as never)

  test('sign-in counts the address and checks the email; forgot counts both; reset counts the address', async () => {
    const { calls, make } = spy()
    const { req } = fakeReq()
    await run('login', { email: ' Kemi.Bello@Example.org ' }, req, make)
    await run('forgotPassword', { email: 'kemi.bello@example.org' }, req, make)
    await run('resetPassword', { token: 'x', password: 'y' }, req, make)
    await run('update', { name: 'x' }, req, make)
    expect(calls).toEqual([
      'consume loginIp 203.0.113.7',
      'check loginEmail kemi.bello@example.org',
      'consume forgotIp 203.0.113.7',
      'consume forgotEmail kemi.bello@example.org',
      'consume resetIp 203.0.113.7',
    ])
  })

  test('trusted server code (the Local API) is never limited', async () => {
    const { calls, make } = spy()
    await run('login', { email: 'a@example.org' }, fakeReq({ payloadAPI: 'local' }).req, make)
    expect(calls).toEqual([])
  })

  test('a 401 from the login endpoint counts once against the email; other errors do not', async () => {
    const { calls, make } = spy()
    const hook = countFailedLogin(make as never)
    const call = (status: number, url = 'http://localhost:3000/api/users/login') =>
      hook({ collection: { slug: 'users' }, error: { status }, req: fakeReq({ url, data: { email: 'A@example.org' } }).req } as never)
    await call(401)
    await call(429)
    await call(400)
    await call(401, 'http://localhost:3000/api/users/forgot-password')
    expect(calls).toEqual(['record loginEmail a@example.org'])
  })

  test('a count that cannot be written is logged with fixed text and does not change the reply', async () => {
    const { req, errors } = fakeReq({ data: { email: 'a@example.org' } })
    const failing = () => ({
      record: async () => {
        throw new Error('connection lost')
      },
    })
    const result = await countFailedLogin(failing as never)({ collection: { slug: 'users' }, error: { status: 401 }, req } as never)
    expect(result).toBeUndefined()
    expect(errors).toEqual(['Rate limit: a failed sign-in could not be counted.'])
  })

  test('a 429 gets its own message as the reply; other errors are left to Payload', () => {
    const reply = (error: unknown) => rateLimitReply({ collection: { slug: 'users' }, error, req: {} } as never)
    expect(reply({ status: 429, message: tooManyMessage(3) })).toEqual({
      response: { errors: [{ message: tooManyMessage(3) }] },
      status: 429,
    })
    expect(reply({ status: 401, message: 'x' })).toBeUndefined()
    expect(reply({ status: 429 })).toBeUndefined()
  })
})
