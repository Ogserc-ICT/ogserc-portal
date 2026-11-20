import type { Config, Endpoint, PayloadRequest, Plugin } from 'payload'
import { payloadTotp } from 'payload-totp'

import { type AuditAction } from '../audit/actions'
import { recordAudit } from '../audit/record'
import { clientAddress, limiter } from './rate-limit'

// Two-factor sign-in for staff (Step 3 plan commit 6, D-084): payload-totp with set-up forced, so
// a session that has not entered a code from an authenticator app has no access at all, through
// the admin panel or the API. The plugin's three endpoints are wrapped with what it lacks:
// a limit per address, a code accepted once cannot be used again, a minimum secret size at set-up,
// and audit log entries.

export const TOTP_ISSUER = 'OGSERC'
export const TOTP_PATHS = { setup: '/setup-totp', verify: '/verify-totp', remove: '/remove-totp' } as const
type Kind = keyof typeof TOTP_PATHS

/** 160 bits, the RFC 4226 recommendation; the plugin's own set-up screen generates 256. */
export const MIN_SECRET_BITS = 160

export const TOTP_MESSAGES = {
  reused: 'That code has already been used. Wait for the next code in your authenticator app.',
  weakSecret: 'This set-up key is too short. Reload the page to get a new one.',
} as const

/** Bits in a base32 secret (5 per character, padding ignored); 0 if it is not base32. */
export function secretBits(secret: unknown): number {
  if (typeof secret !== 'string') return 0
  const value = secret.replace(/=+$/, '').toUpperCase()
  return /^[A-Z2-7]+$/.test(value) ? value.length * 5 : 0
}

const SUCCESS: Record<Kind, AuditAction> = { setup: '2fa.enrolled', verify: '2fa.verified', remove: '2fa.removed' }

type StaffUser = { id: number | string; email?: unknown; collection?: string }
const staffUser = (req: PayloadRequest) => {
  const user = req.user as StaffUser | null | undefined
  return user?.collection === 'users' ? user : undefined
}

/** The JSON body, read once; the plugin then reads the same object through req.json. */
async function readBody(req: PayloadRequest): Promise<Record<string, unknown> | undefined> {
  let body: unknown
  try {
    body = req.json ? await req.json() : undefined
  } catch {
    body = undefined
  }
  req.json = async () => body
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : undefined
}

/** A refusal in the plugin's own reply shape, which its admin screens read. */
const refuse = (message: string, status = 400, headers?: Headers) => Response.json({ ok: false, message }, { status, headers })

/** Whether the plugin accepted the request (it answers `{ ok }`, with status 200 either way). */
async function accepted(response: Response): Promise<boolean> {
  try {
    return ((await response.clone().json()) as { ok?: unknown }).ok === true
  } catch {
    return false
  }
}

type Handler = Endpoint['handler']

/** Wraps one of the plugin's endpoints. Requests without a staff session go to the plugin, which refuses them. */
export function guardTotpEndpoint(kind: Kind, handler: Handler, createLimiter = limiter): Handler {
  return async (req) => {
    const user = staffUser(req)
    if (!user) return handler(req)
    const target = { type: 'user' as const, id: user.id, label: user.email }
    const audit = (action: AuditAction, reason?: string) =>
      recordAudit(req, { action, actor: user, target, details: reason ? { reason, via: kind } : { via: kind } }, { separate: true })
    const limits = createLimiter(req)

    try {
      await limits.consume('totpIp', clientAddress(req.headers))
    } catch (error) {
      const { status, message } = error as { status?: unknown; message?: unknown }
      if (status !== 429) throw error
      await audit('2fa.failed', 'too many attempts')
      return refuse(String(message), 429, req.responseHeaders)
    }

    const body = await readBody(req)
    if (kind === 'setup' && secretBits(body?.secret) < MIN_SECRET_BITS) {
      await audit('2fa.failed', 'set-up key too short')
      return refuse(TOTP_MESSAGES.weakSecret)
    }
    // Marked used before the plugin checks it, so two requests with one code cannot both pass.
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (token && !(await limits.first('totpUsed', `${user.id}:${token}`))) {
      await audit('2fa.failed', 'code already used')
      return refuse(TOTP_MESSAGES.reused)
    }

    const response = await handler(req)
    if (await accepted(response)) await audit(SUCCESS[kind])
    else await audit('2fa.failed', 'wrong code')
    return response
  }
}

/** The plugin's endpoints, each wrapped. Fails loudly if a plugin update renames one. */
export function guardTotpEndpoints(config: Config): Config {
  const endpoints = config.endpoints ?? []
  const wrapped = endpoints.map((endpoint) => {
    const kind = (Object.keys(TOTP_PATHS) as Kind[]).find((k) => TOTP_PATHS[k] === endpoint.path && endpoint.method === 'post')
    return kind ? { ...endpoint, handler: guardTotpEndpoint(kind, endpoint.handler) } : endpoint
  })
  const found = wrapped.filter((endpoint, n) => endpoint !== endpoints[n]).length
  if (found !== Object.keys(TOTP_PATHS).length) {
    throw new Error(`payload-totp: expected its ${Object.keys(TOTP_PATHS).length} endpoints, found ${found}. Check the plugin version (D-084).`)
  }
  return { ...config, endpoints: wrapped }
}

/**
 * payload-totp on the staff collection, run after every other plugin (it wraps the access they
 * leave), with its endpoints guarded. `enabled: false` leaves access unwrapped and adds no
 * endpoints; the schema stays the same either way (the plugin keeps its field and collection).
 */
export function twoFactor({ enabled }: { enabled: boolean }): Plugin {
  const plugin = payloadTotp({
    collection: 'users',
    forceSetup: true,
    disabled: !enabled,
    // The defaults every authenticator app supports.
    totp: { issuer: TOTP_ISSUER, algorithm: 'SHA1', digits: 6, period: 30 },
  })
  const run: Plugin = async (config) => {
    const result = await plugin(config)
    return enabled ? guardTotpEndpoints(result) : result
  }
  return Object.assign(run, { order: Number.MAX_SAFE_INTEGER })
}
