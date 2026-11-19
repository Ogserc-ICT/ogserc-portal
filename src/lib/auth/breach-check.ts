import { createHash } from 'node:crypto'

// Have I Been Pwned's Pwned Passwords range API (Step 3 plan commit 3, D-053). k-anonymity: only
// the first 5 characters of the password's SHA-1 hash leave the server; the reply lists every
// known suffix with that prefix, and the match is made here. `Add-Padding` asks for fake entries
// (count 0) so the reply's size does not hint at the prefix either. No API key is needed.

export const BREACH_API = 'https://api.pwnedpasswords.com/range/'
export const BREACH_TIMEOUT_MS = 3000

/** Found: on the breach list. Clear: not on it. Unavailable: the service could not answer. Off: not checked. */
export type BreachResult = 'found' | 'clear' | 'unavailable' | 'off'

type Fetch = (url: string, init: RequestInit) => Promise<Response>
type Env = Record<string, string | undefined>
type Options = { fetch?: Fetch; env?: Env; timeoutMs?: number }

/** The check is on unless PASSWORD_BREACH_CHECK is exactly "off" (CI and offline development). */
export function breachCheckEnabled(env: Env = process.env): boolean {
  return env.PASSWORD_BREACH_CHECK !== 'off'
}

/** Upper-case hex SHA-1, split into the 5-character prefix sent and the 35-character suffix kept. */
export function hashParts(password: string): { prefix: string; suffix: string } {
  const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
  return { prefix: hash.slice(0, 5), suffix: hash.slice(5) }
}

/** True if the range reply lists `suffix` with a count above 0 (padding entries have 0). */
export function rangeContains(body: string, suffix: string): boolean {
  for (const line of body.split('\n')) {
    const [candidate, count] = line.trim().split(':')
    if (candidate?.toUpperCase() === suffix && Number(count) > 0) return true
  }
  return false
}

/**
 * Whether the password appears in a known data breach. Never throws: any network error, timeout
 * or unexpected status gives 'unavailable', and the caller decides what that means.
 */
export async function checkBreached(
  password: string,
  { fetch: fetchFn = fetch, env = process.env, timeoutMs = BREACH_TIMEOUT_MS }: Options = {},
): Promise<BreachResult> {
  if (!breachCheckEnabled(env)) return 'off'
  const { prefix, suffix } = hashParts(password)
  try {
    const response = await fetchFn(`${BREACH_API}${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'ogserc-portal password check' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (response.status !== 200) return 'unavailable'
    return rangeContains(await response.text(), suffix) ? 'found' : 'clear'
  } catch {
    return 'unavailable'
  }
}
