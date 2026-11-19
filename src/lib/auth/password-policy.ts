// Staff password rules (NFR-SEC-01, Step 3 plan commit 3, D-053). Pure, so every rule can be unit
// tested. Messages are fixed text: they never include the password or any part of it.

export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 128

/**
 * A string longer than this many UTF-16 code units has more than 128 code points for certain
 * (a code point is at most 2 units, and 2 × 128 = 256), so it is refused before anything iterates
 * over it. Kept well above 256 so the code point count, not this bound, decides near the limit.
 */
const MAX_CODE_UNITS = 512

/** The commission's name, which staff must not build passwords from. */
const ORGANISATION_NAME = 'ogserc'

export const PASSWORD_MESSAGES = {
  missing: 'Enter a password.',
  tooShort: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  tooLong: `Use at most ${MAX_PASSWORD_LENGTH} characters.`,
  organisation: 'A password must not contain "ogserc".',
  email: 'A password must not contain the email address, or part of it, before the @.',
  common: 'This password is on a list of common passwords. Choose another.',
  breached: 'This password has appeared in a data breach elsewhere. Choose another.',
} as const

/**
 * Parts of an email's local part a password must not contain: the whole local part if it has at
 * least 3 characters, and each piece between `.`, `_`, `-` and `+` of at least 4 characters
 * (shorter pieces, such as initials, would refuse too many good passwords). Lower case.
 */
export function emailWords(email: unknown): string[] {
  if (typeof email !== 'string') return []
  const at = email.lastIndexOf('@')
  const local = (at === -1 ? email : email.slice(0, at)).toLowerCase()
  const words = new Set<string>()
  if (local.length >= 3) words.add(local)
  for (const piece of local.split(/[._+-]/)) if (piece.length >= 4) words.add(piece)
  return [...words]
}

/**
 * Why `password` breaks the policy, or undefined if it meets it. `emails` are every address the
 * account has or is being given (all are checked), `common` the lower-cased common-passwords list.
 * No trimming or Unicode normalisation: the policy checks exactly the string Payload will hash.
 */
export function passwordProblem(password: unknown, emails: unknown[], common: ReadonlySet<string>): string | undefined {
  if (typeof password !== 'string' || password === '') return PASSWORD_MESSAGES.missing
  if (password.length > MAX_CODE_UNITS) return PASSWORD_MESSAGES.tooLong
  const length = [...password].length
  if (length < MIN_PASSWORD_LENGTH) return PASSWORD_MESSAGES.tooShort
  if (length > MAX_PASSWORD_LENGTH) return PASSWORD_MESSAGES.tooLong

  const lower = password.toLowerCase()
  if (lower.includes(ORGANISATION_NAME)) return PASSWORD_MESSAGES.organisation
  if (emails.flatMap(emailWords).some((word) => lower.includes(word))) return PASSWORD_MESSAGES.email
  if (common.has(lower)) return PASSWORD_MESSAGES.common
  return undefined
}
