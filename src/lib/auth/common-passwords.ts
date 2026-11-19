import { readFileSync } from 'node:fs'
import path from 'node:path'

// The bundled common-passwords list (data/common-passwords/SOURCE.md). Read from disk on every
// check and never cached in the module: password changes are rare, and module state must not be
// shared between the separately bundled copies of this code (CLAUDE.md, D-051). The standalone
// build carries the file (next.config.ts outputFileTracingIncludes); every server and `payload run`
// script starts in the project root, so the path is resolved from the working directory.

export const COMMON_PASSWORDS_FILE = path.join('data', 'common-passwords', '10k-most-common.txt')

/** The list, lower-cased. Throws if the file cannot be read; callers must then refuse, not skip. */
export function readCommonPasswords(cwd: string = process.cwd()): Set<string> {
  const text = readFileSync(path.join(cwd, COMMON_PASSWORDS_FILE), 'utf8')
  const entries = text.split(/\r?\n/).filter(Boolean)
  if (entries.length === 0) throw new Error('The common-passwords list is empty.')
  return new Set(entries.map((entry) => entry.toLowerCase()))
}
