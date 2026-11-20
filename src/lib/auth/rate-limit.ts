import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'

import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import { APIError, type CollectionBeforeOperationHook, type CollectionConfig, type PayloadRequest } from 'payload'

import { isLoginRequest } from './generic-login-error'

// Rate limits on staff sign-in, forgotten passwords and reset links (Step 3 plan commit 4, D-081).
// Fixed windows counted in the rate_limits table (src/collections/RateLimits.ts). Counts are
// written on the connection pool, outside the request's transaction: a refused sign-in rolls that
// transaction back, and must not roll back its own count.

export type Rule = { limit: number; windowSeconds: number }

export const RULES = {
  /** Every sign-in attempt from one address. */
  loginIp: { limit: 10, windowSeconds: 15 * 60 },
  /** Failed sign-ins for one email, known or not. Above the lockout (5), so the lockout still shows. */
  loginEmail: { limit: 10, windowSeconds: 15 * 60 },
  forgotIp: { limit: 5, windowSeconds: 60 * 60 },
  forgotEmail: { limit: 3, windowSeconds: 60 * 60 },
  resetIp: { limit: 10, windowSeconds: 60 * 60 },
  /** Two-factor code checks (set-up, verify, remove) from one address (D-084). */
  totpIp: { limit: 10, windowSeconds: 15 * 60 },
  /** A two-factor code accepted once may not be used again while it is still valid (D-084). */
  totpUsed: { limit: 1, windowSeconds: 90 },
} as const satisfies Record<string, Rule>

export type RuleName = keyof typeof RULES

export const tooManyMessage = (minutes: number) =>
  `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`

/** A window's state after a hit or a look: how many so far, and when the window ends. */
export type Window = { count: number; resetAt: Date }

/** Where counts are kept: Postgres in the app, a fake in unit tests. */
export type Store = {
  /** Adds one to `key`'s window (starting a new one if it ended) and returns the new state. */
  hit: (key: string, windowSeconds: number) => Promise<Window>
  /** The current window, without counting; undefined if there is none or it ended. */
  peek: (key: string) => Promise<Window | undefined>
  /** Deletes ended windows. */
  sweep: () => Promise<void>
}

type Env = Record<string, string | undefined>

/**
 * The visitor's address, from the header named in CLIENT_IP_HEADER (for example X-Forwarded-For
 * behind Caddy). The last entry is the one our own proxy added; earlier entries come from the
 * visitor and can be made up. Without the setting (development) or with an unusable value, every
 * request shares one address bucket: production refuses to start without it (src/lib/env.ts).
 */
export function clientAddress(headers: Headers, env: Env = process.env): string {
  const name = env.CLIENT_IP_HEADER?.trim()
  if (!name) return 'unknown'
  const last = headers.get(name)?.split(',').at(-1)?.trim() ?? ''
  return isIP(last) ? last.toLowerCase() : 'unknown'
}

/** The stored key: an HMAC, so the table never holds an address or email in readable form. */
export function rateKey(rule: RuleName, value: string, secret: string): string {
  return createHmac('sha256', secret).update(`rate-limit\0${rule}\0${value}`).digest('hex')
}

const normaliseEmail = (email: unknown): string | undefined =>
  typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined

/** Seconds until `resetAt`, at least 1. */
const secondsLeft = (resetAt: Date, now: Date) => Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000))

/** A 429 with Retry-After. Payload's error route adds `req.responseHeaders` to its reply. */
export function tooManyAttempts(req: PayloadRequest, resetAt: Date, now = new Date()) {
  const seconds = secondsLeft(resetAt, now)
  req.responseHeaders = new Headers({ 'Retry-After': String(seconds) })
  return new APIError(tooManyMessage(Math.ceil(seconds / 60)), 429, undefined, true)
}

/** Postgres store on Payload's connection pool. Parameterised statements only. */
export function postgresStore(req: PayloadRequest): Store {
  const db = (req.payload.db as unknown as PostgresAdapter).drizzle
  return {
    async hit(key, windowSeconds) {
      const { rows } = await db.execute(sql`
        insert into rate_limits (key, count, expires_at)
        values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
        on conflict (key) do update set
          count = case when rate_limits.expires_at <= now() then 1 else rate_limits.count + 1 end,
          expires_at = case when rate_limits.expires_at <= now() then excluded.expires_at else rate_limits.expires_at end
        returning count, expires_at`)
      const row = rows[0] as { count: unknown; expires_at: unknown }
      return { count: Number(row.count), resetAt: new Date(String(row.expires_at)) }
    },
    async peek(key) {
      const { rows } = await db.execute(
        sql`select count, expires_at from rate_limits where key = ${key} and expires_at > now()`,
      )
      const row = rows[0] as { count: unknown; expires_at: unknown } | undefined
      return row ? { count: Number(row.count), resetAt: new Date(String(row.expires_at)) } : undefined
    },
    async sweep() {
      await db.execute(sql`delete from rate_limits where expires_at <= now()`)
    },
  }
}

type Limiter = {
  /** Counts one attempt; throws the 429 if that makes it more than the rule allows. */
  consume: (rule: RuleName, value: string) => Promise<void>
  /** Throws the 429 if the rule's limit is already reached, without counting. */
  check: (rule: RuleName, value: string) => Promise<void>
  /** Counts one attempt without refusing (a failure that has already happened). */
  record: (rule: RuleName, value: string) => Promise<void>
  /** Counts one use and says whether it was the first in the rule's window. Atomic, so two at once cannot both be first. */
  first: (rule: RuleName, value: string) => Promise<boolean>
}

type Options = { store?: Store; now?: () => Date; sweepChance?: number; random?: () => number }

export function limiter(req: PayloadRequest, options: Options = {}): Limiter {
  const store = options.store ?? postgresStore(req)
  const now = options.now ?? (() => new Date())
  const key = (rule: RuleName, value: string) => rateKey(rule, value, req.payload.secret)
  // About one request in 20 clears ended windows, so the table stays small without a timer.
  const maybeSweep = async () => {
    if ((options.random ?? Math.random)() < (options.sweepChance ?? 0.05)) await store.sweep()
  }
  return {
    async consume(rule, value) {
      const { count, resetAt } = await store.hit(key(rule, value), RULES[rule].windowSeconds)
      await maybeSweep()
      if (count > RULES[rule].limit) throw tooManyAttempts(req, resetAt, now())
    },
    async check(rule, value) {
      const window = await store.peek(key(rule, value))
      if (window && window.count >= RULES[rule].limit) throw tooManyAttempts(req, window.resetAt, now())
    },
    async record(rule, value) {
      await store.hit(key(rule, value), RULES[rule].windowSeconds)
    },
    async first(rule, value) {
      return (await store.hit(key(rule, value), RULES[rule].windowSeconds)).count === 1
    },
  }
}

/** Only requests from the internet are limited; trusted server code (the Local API) is not. */
const fromTheInternet = (req: PayloadRequest) => req.payloadAPI === 'REST' && Boolean(req.headers)

/**
 * beforeOperation on the staff collection, listed first so a limited request does no other work:
 * - sign-in: every attempt counts against the address; the email is refused once it has had its
 *   limit of failures (counted by countFailedLogin), whether or not the account exists;
 * - forgotten password: per address and per email, counted on every request;
 * - reset link: per address.
 * The reply is the same 429 in every case, so it never shows whether an account exists.
 */
export const rateLimitAuth = (createLimiter: (req: PayloadRequest) => Limiter = (req) => limiter(req)) => {
  const hook: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
    if (!fromTheInternet(req)) return args
    const data = (args as { data?: { email?: unknown } }).data
    const email = normaliseEmail(data?.email)
    const address = clientAddress(req.headers)
    const limits = createLimiter(req)
    if (operation === 'login') {
      await limits.consume('loginIp', address)
      if (email) await limits.check('loginEmail', email)
    } else if (operation === 'forgotPassword') {
      await limits.consume('forgotIp', address)
      if (email) await limits.consume('forgotEmail', email)
    } else if (operation === 'resetPassword') {
      await limits.consume('resetIp', address)
    }
    return args
  }
  return hook
}

type AfterErrorHook = NonNullable<NonNullable<CollectionConfig['hooks']>['afterError']>[number]

/**
 * afterError on the staff collection: a sign-in refused with 401 (unknown email, wrong password or
 * locked account) counts once against the email. A successful sign-in never counts, so staff who
 * type their password right are not slowed down by someone else's guesses from elsewhere.
 * Listed before genericLoginError, which replaces the reply but not the status.
 */
export const countFailedLogin = (createLimiter: (req: PayloadRequest) => Limiter = (req) => limiter(req)) => {
  const hook: AfterErrorHook = async ({ collection, error, req }) => {
    const status = (error as { status?: unknown }).status
    if (status !== 401 || !isLoginRequest(req, req.payload.config.routes.api, collection.slug)) return
    const email = normaliseEmail((req.data as { email?: unknown } | undefined)?.email)
    if (!email) return
    try {
      await createLimiter(req).record('loginEmail', email)
    } catch {
      // The reply stays the generic 401; only the count is lost. Fixed text, no email (NFR-SEC-20).
      req.payload.logger.error('Rate limit: a failed sign-in could not be counted.')
    }
  }
  return hook
}

/**
 * afterError on the staff collection: writes the reply for a 429 itself. Payload's formatter
 * recognises its error classes by `instanceof` and by name, and class names are minified in the
 * production build, so it would answer "An unknown error occurred." (D-051). Decided by status
 * only; nothing else in this collection answers 429. Retry-After is already on req.responseHeaders.
 */
export const rateLimitReply: AfterErrorHook = ({ error }) => {
  const { status, message } = error as { status?: unknown; message?: unknown }
  if (status !== 429 || typeof message !== 'string') return
  return { response: { errors: [{ message }] }, status: 429 }
}

/** The hooks the staff collection uses (src/collections/Users.ts), with the Postgres store. */
export const limitAuthRequests = rateLimitAuth()
export const countFailedLogins = countFailedLogin()
