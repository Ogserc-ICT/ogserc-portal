// The folder the database-backed test server stores uploads in (MEDIA_DIR), so test files never
// land in the development `media/` folder. It is emptied before and after every run, so the
// checks below refuse any folder that is not clearly a throwaway one in the OS temp folder.

import { mkdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROJECT_MEDIA_DIR = path.resolve(import.meta.dirname, '..', '..', 'media')

export function testMediaDir(): string {
  return path.join(os.tmpdir(), 'ogserc-e2e-media')
}

const isInside = (child: string, parent: string): boolean => {
  const relative = path.relative(parent, child)
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
}

/** Why `dir` must not be emptied, or null if it is a safe throwaway test folder. */
export function testMediaDirProblem(dir: string, tmpDir = os.tmpdir(), projectMediaDir = PROJECT_MEDIA_DIR): string | null {
  const resolved = path.resolve(dir)
  if (!isInside(resolved, path.resolve(tmpDir))) return `${resolved} is not inside the OS temp folder.`
  if (!path.basename(resolved).includes('e2e')) return `${resolved}: the folder name must contain "e2e".`
  const media = path.resolve(projectMediaDir)
  if (resolved === media || isInside(resolved, media) || isInside(media, resolved)) {
    return `${resolved} is or contains the development media folder.`
  }
  return null
}

/** Deletes everything in the test uploads folder and leaves it empty. Refuses unsafe folders. */
export function emptyTestMediaDir(dir: string): void {
  const problem = testMediaDirProblem(dir)
  if (problem) throw new Error(`[e2e-db] Refusing to empty the test uploads folder: ${problem}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}
