import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

// Spam check for the contact form (FR-CNT-02, D-059): the page issues a signed timestamp, and a
// form sent back within seconds came from a bot. The signature stops a bot from back-dating it.

const MIN_FILL_MS = 3_000
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export type TokenCheck = 'ok' | 'too-fast' | 'expired' | 'invalid'

function signingKey(): Buffer {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set')
  // A key of its own, derived from the secret, so this signature is never valid anywhere else.
  return createHash('sha256').update(`ogserc-contact-form-token:${secret}`).digest()
}

const sign = (issuedAt: string): string =>
  createHmac('sha256', signingKey()).update(issuedAt).digest('base64url')

export function issueFormToken(now = Date.now()): string {
  const issuedAt = String(now)
  return `${issuedAt}.${sign(issuedAt)}`
}

export function checkFormToken(token: unknown, now = Date.now()): TokenCheck {
  if (typeof token !== 'string') return 'invalid'
  const [issuedAt, signature, ...rest] = token.split('.')
  if (!issuedAt || !signature || rest.length > 0 || !/^\d{13}$/.test(issuedAt)) return 'invalid'

  const expected = Buffer.from(sign(issuedAt))
  const given = Buffer.from(signature)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'invalid'

  const age = now - Number(issuedAt)
  if (age < MIN_FILL_MS) return 'too-fast'
  if (age > MAX_AGE_MS) return 'expired'
  return 'ok'
}
