import { readFile, rm, writeFile } from 'node:fs/promises'

// A result computed once per test run and reused by later tests in the run, for example after a
// failed test restarts the worker and its beforeAll runs again. Stored next to the run's admin
// file in the OS temp folder (playwright.db.config.ts) and removed in global teardown.

function cacheFile(name: string): string {
  const adminFile = process.env.E2E_ADMIN_FILE
  if (!adminFile) throw new Error('E2E_ADMIN_FILE is not set (see playwright.db.config.ts).')
  return adminFile.replace(/\.json$/, `-${name}.json`)
}

export async function oncePerRun<T>(name: string, compute: () => Promise<T>): Promise<T> {
  try {
    return JSON.parse(await readFile(cacheFile(name), 'utf8')) as T
  } catch {
    const value = await compute()
    await writeFile(cacheFile(name), JSON.stringify(value))
    return value
  }
}

export async function clearRunCache(names: string[]): Promise<void> {
  if (!process.env.E2E_ADMIN_FILE) return
  await Promise.all(names.map((name) => rm(cacheFile(name), { force: true })))
}
