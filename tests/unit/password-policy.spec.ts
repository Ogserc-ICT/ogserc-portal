import { expect, test } from '@playwright/test'
import { randomBytes } from 'node:crypto'

import { readCommonPasswords } from '../../src/lib/auth/common-passwords'
import { emailWords, PASSWORD_MESSAGES, passwordProblem } from '../../src/lib/auth/password-policy'

// The staff password rules (D-053). Passwords are random at run time, so none of them is on the
// common list or contains an email word by accident, and the source holds no password literal.

const NONE = new Set<string>()
const MESSAGES = new Set<string>(Object.values(PASSWORD_MESSAGES))

/** Random lower-case hex of exactly `length` characters. */
const filler = (length: number) => randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)

test.describe('length, in code points', () => {
  test('12 to 128 characters', () => {
    expect(passwordProblem(filler(11), [], NONE)).toBe(PASSWORD_MESSAGES.tooShort)
    expect(passwordProblem(filler(12), [], NONE)).toBeUndefined()
    expect(passwordProblem(filler(128), [], NONE)).toBeUndefined()
    expect(passwordProblem(filler(129), [], NONE)).toBe(PASSWORD_MESSAGES.tooLong)
  })

  test('characters outside the basic plane count once each', () => {
    const key = '\u{1F511}' // two UTF-16 code units
    expect(passwordProblem(key.repeat(11), [], NONE)).toBe(PASSWORD_MESSAGES.tooShort)
    expect(passwordProblem(key.repeat(12), [], NONE)).toBeUndefined()
    expect(passwordProblem(key.repeat(128), [], NONE)).toBeUndefined()
    expect(passwordProblem(key.repeat(129), [], NONE)).toBe(PASSWORD_MESSAGES.tooLong)
  })

  test('very long input is refused as too long', () => {
    expect(passwordProblem(filler(513), [], NONE)).toBe(PASSWORD_MESSAGES.tooLong)
    expect(passwordProblem(filler(100_000), [], NONE)).toBe(PASSWORD_MESSAGES.tooLong)
  })

  test('spaces count and are kept: nothing is trimmed', () => {
    expect(passwordProblem(`  ${filler(8)} `, [], NONE)).toBe(PASSWORD_MESSAGES.tooShort)
    expect(passwordProblem(`  ${filler(10)}`, [], NONE)).toBeUndefined()
  })
})

test('anything that is not a non-empty string is refused', () => {
  for (const value of [undefined, null, '', 123456789012345, {}, [filler(20)], true]) {
    expect(passwordProblem(value, [], NONE), JSON.stringify(value)).toBe(PASSWORD_MESSAGES.missing)
  }
})

test('"ogserc" in any case, anywhere', () => {
  expect(passwordProblem(`${filler(6)}OgSeRc${filler(6)}`, [], NONE)).toBe(PASSWORD_MESSAGES.organisation)
  expect(passwordProblem(`ogserc${filler(10)}`, [], NONE)).toBe(PASSWORD_MESSAGES.organisation)
})

test.describe('the email address', () => {
  test('words taken from the local part', () => {
    expect(emailWords('Adebayo.Ogun+cms@example.org')).toEqual(['adebayo.ogun+cms', 'adebayo', 'ogun'])
    expect(emailWords('ab@example.org')).toEqual([]) // too short to refuse anything by
    expect(emailWords('abc@example.org')).toEqual(['abc'])
    expect(emailWords('ab.cdef@example.org')).toEqual(['ab.cdef', 'cdef'])
    expect(emailWords(undefined)).toEqual([])
  })

  test('a password containing the local part or a part of it is refused, in any case', () => {
    const email = 'adebayo.ogun@example.org'
    expect(passwordProblem(`${filler(6)}ADEBAYO.OGUN`, [email], NONE)).toBe(PASSWORD_MESSAGES.email)
    expect(passwordProblem(`${filler(8)}Adebayo${filler(2)}`, [email], NONE)).toBe(PASSWORD_MESSAGES.email)
    expect(passwordProblem(`ogun${filler(10)}`, [email], NONE)).toBe(PASSWORD_MESSAGES.email)
    expect(passwordProblem(filler(16), [email], NONE)).toBeUndefined()
  })

  test('every address given is checked', () => {
    const password = `${filler(8)}tolu${filler(4)}`
    expect(passwordProblem(password, ['new.person@example.org', 'tolu.ade@example.org'], NONE)).toBe(
      PASSWORD_MESSAGES.email,
    )
    expect(passwordProblem(password, [undefined, 'new.person@example.org'], NONE)).toBeUndefined()
  })
})

test.describe('the bundled common-passwords list', () => {
  const list = readCommonPasswords()
  const long = [...list].filter((entry) => [...entry].length >= 12)

  test('10 entries are long enough to reach the list check', () => {
    expect(long).toHaveLength(10)
  })

  test('each of them is refused, in any case', () => {
    for (const entry of long) {
      expect(passwordProblem(entry, [], list)).toBe(PASSWORD_MESSAGES.common)
      expect(passwordProblem(entry.toUpperCase(), [], list)).toBe(PASSWORD_MESSAGES.common)
    }
  })

  test('shorter entries are already refused by the length rule', () => {
    const short = [...list].find((entry) => [...entry].length < 12)!
    expect(passwordProblem(short, [], list)).toBe(PASSWORD_MESSAGES.tooShort)
  })

  test('a random password is not on it', () => {
    expect(passwordProblem(filler(20), [], list)).toBeUndefined()
  })
})

test('every refusal is one of the fixed messages, never the password', () => {
  const cases: [unknown, unknown[]][] = [
    [filler(5), []],
    [filler(200), []],
    [`ogserc${filler(10)}`, []],
    [`adebayo${filler(10)}`, ['adebayo@example.org']],
  ]
  for (const [password, emails] of cases) {
    const message = passwordProblem(password, emails, NONE)!
    expect(MESSAGES.has(message)).toBe(true)
    expect(message).not.toContain(String(password))
  }
})
