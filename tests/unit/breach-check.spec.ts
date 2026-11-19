import { expect, test } from '@playwright/test'
import { createHash, randomBytes } from 'node:crypto'
import { ValidationError } from 'payload'

import { BREACH_API, breachCheckEnabled, checkBreached, hashParts, rangeContains } from '../../src/lib/auth/breach-check'
import { BREACH_CHECK_SKIPPED, enforcePasswordPolicy } from '../../src/lib/auth/enforce-password-policy'
import { PASSWORD_MESSAGES } from '../../src/lib/auth/password-policy'

// The Have I Been Pwned range check with a fake fetch: no test calls the real service (D-053).

const strong = () => randomBytes(12).toString('hex')
const on = { PASSWORD_BREACH_CHECK: undefined }

type Call = { url: string; init: RequestInit }

/** A fake fetch that records each call and answers with `reply` (a body, a status, or a thrown error). */
function fakeFetch(reply: { body?: string; status?: number } | Error) {
  const calls: Call[] = []
  const fetch = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    if (reply instanceof Error) throw reply
    return new Response(reply.body ?? '', { status: reply.status ?? 200 })
  }
  return { fetch, calls }
}

/** A padded range reply: some unrelated entries, padding with count 0, and optionally the suffix. */
function rangeBody(suffix: string, count: number | undefined): string {
  const other = () => randomBytes(18).toString('hex').slice(0, 35).toUpperCase()
  const lines = [`${other()}:3`, `${other()}:0`, `${other()}:12`]
  if (count !== undefined) lines.splice(1, 0, `${suffix}:${count}`)
  return lines.join('\r\n')
}

test('hashParts splits the upper-case SHA-1 into a 5-character prefix and the rest', () => {
  const hash = createHash('sha1').update('correct horse battery staple').digest('hex').toUpperCase()
  expect(hashParts('correct horse battery staple')).toEqual({ prefix: hash.slice(0, 5), suffix: hash.slice(5) })
})

test('only the 5-character prefix is sent, with padding requested and a timeout', async () => {
  const password = strong()
  const { fetch, calls } = fakeFetch({ body: '' })
  await checkBreached(password, { fetch, env: on })
  expect(calls).toHaveLength(1)
  const { prefix, suffix } = hashParts(password)
  expect(calls[0]!.url).toBe(`${BREACH_API}${prefix}`)
  expect(calls[0]!.url).not.toContain(suffix)
  expect(calls[0]!.url).not.toContain(password)
  expect(new Headers(calls[0]!.init.headers).get('Add-Padding')).toBe('true')
  expect(calls[0]!.init.signal).toBeInstanceOf(AbortSignal)
})

test('a listed suffix is found; padding (count 0) and other suffixes are not', async () => {
  const password = strong()
  const { suffix } = hashParts(password)
  const result = async (count: number | undefined) =>
    checkBreached(password, { fetch: fakeFetch({ body: rangeBody(suffix, count) }).fetch, env: on })
  expect(await result(42)).toBe('found')
  expect(await result(0)).toBe('clear')
  expect(await result(undefined)).toBe('clear')
})

test('rangeContains ignores case, blank lines and malformed lines', () => {
  const suffix = hashParts(strong()).suffix
  expect(rangeContains(`\n${suffix.toLowerCase()}:5\n`, suffix)).toBe(true)
  expect(rangeContains(`${suffix}\n${suffix}:x\n:5`, suffix)).toBe(false)
})

test('a network error, a timeout or an unexpected status gives "unavailable", never a throw', async () => {
  for (const reply of [new Error('ECONNRESET'), new DOMException('timed out', 'TimeoutError'), { status: 503 }, { status: 429 }]) {
    expect(await checkBreached(strong(), { fetch: fakeFetch(reply).fetch, env: on }), String(reply)).toBe('unavailable')
  }
})

test('a slow service is cut off by the timeout', async () => {
  const hang = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason)))
  expect(await checkBreached(strong(), { fetch: hang, env: on, timeoutMs: 50 })).toBe('unavailable')
})

test('PASSWORD_BREACH_CHECK=off skips the request; anything else leaves the check on', async () => {
  const { fetch, calls } = fakeFetch({ body: '' })
  expect(await checkBreached(strong(), { fetch, env: { PASSWORD_BREACH_CHECK: 'off' } })).toBe('off')
  expect(calls).toHaveLength(0)
  for (const value of [undefined, '', 'on', 'OFF', 'false']) {
    expect(breachCheckEnabled({ PASSWORD_BREACH_CHECK: value }), String(value)).toBe(true)
  }
})

test.describe('in the password policy', () => {
  function fakeReq() {
    const warnings: unknown[] = []
    const req = { payload: { logger: { error: () => {}, warn: (message: unknown) => warnings.push(message) } } }
    return { req: req as never, warnings }
  }
  const check = (password: string, result: 'found' | 'clear' | 'unavailable' | 'off', req: never) => {
    const calls: string[] = []
    const run = enforcePasswordPolicy(
      { password, emails: ['a.person@example.org'], collection: 'users', req },
      {
        checkBreach: async (sent) => {
          calls.push(sent)
          return result
        },
      },
    )
    return { run, calls }
  }

  test('a breached password is refused with 400 on the password path', async () => {
    const { req } = fakeReq()
    const error = await check(strong(), 'found', req).run.catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ValidationError)
    const { status, data } = error as ValidationError
    expect({ status, ...data.errors[0] }).toEqual({ status: 400, path: 'password', message: PASSWORD_MESSAGES.breached })
  })

  test('an unavailable service accepts the password with one fixed warning that holds no password', async () => {
    const { req, warnings } = fakeReq()
    const password = strong()
    await expect(check(password, 'unavailable', req).run).resolves.toBeUndefined()
    expect(warnings).toEqual([BREACH_CHECK_SKIPPED])
    expect(String(warnings[0])).not.toContain(password)
  })

  test('clear and off accept the password without a warning', async () => {
    for (const result of ['clear', 'off'] as const) {
      const { req, warnings } = fakeReq()
      await expect(check(strong(), result, req).run).resolves.toBeUndefined()
      expect(warnings, result).toEqual([])
    }
  })

  test('a password that breaks a local rule never reaches the breach check', async () => {
    const { req } = fakeReq()
    const { run, calls } = check(`ogserc${strong()}`, 'clear', req)
    await expect(run).rejects.toBeInstanceOf(ValidationError)
    expect(calls).toEqual([])
  })
})
