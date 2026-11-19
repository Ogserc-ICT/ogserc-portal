import { exec } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(exec)

/**
 * Runs a test-only `payload run` script against the test database and returns what it confirmed.
 * The script must write its result to E2E_SCRIPT_CONFIRM_FILE: `payload run` can exit with code 0
 * without running the script (D-047), so the exit code alone never counts. One retry.
 * `extraEnv` is added for the script's process only, never for the test server.
 */
export async function runTestDbScript(
  script: string,
  args: string[],
  extraEnv: Record<string, string> = {},
): Promise<unknown> {
  const confirmFile = path.join(os.tmpdir(), `ogserc-e2e-script-${process.pid}.json`)
  const env = {
    ...process.env,
    ...extraEnv,
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
    PROTECTED_DATABASE_URL: process.env.DATABASE_URL ?? '',
    E2E_SCRIPT_CONFIRM_FILE: confirmFile,
  }
  // Arguments are test-generated emails; quote them anyway so the shell never splits or expands them.
  const command = ['pnpm', 'payload', 'run', script, ...args.map((arg) => JSON.stringify(arg))].join(' ')
  for (let attempt = 1; attempt <= 2; attempt++) {
    await rm(confirmFile, { force: true })
    await run(command, { env })
    try {
      return JSON.parse(await readFile(confirmFile, 'utf8')) as unknown
    } catch {
      // No confirmation: the script did not run. Try once more.
    } finally {
      await rm(confirmFile, { force: true })
    }
  }
  throw new Error(`${script} exited without confirming that it ran (2 attempts).`)
}
