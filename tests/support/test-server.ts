// Starts the database-backed test server for playwright.db.config.ts:
//   node --experimental-strip-types tests/support/test-server.ts <dev|start>
//
// 1. Refuses unless the previous test server has stopped: nothing may be listening on the port,
//    and the process recorded by the previous run must no longer exist. This runs BEFORE the
//    reset, because an earlier server still running (for example with a hung request) could
//    write to the test database after it has been emptied. The config runs the same check first.
// 2. Runs the reset (reset-test-db.ts), then the server, in the same environment.
// 3. Copies all of their output to the console and, with secrets removed (redact below), to
//    test-results/e2e-db-server.log, so a failed run can be investigated afterwards.
//
// One self-contained file: Node runs it with type stripping, which cannot resolve extensionless
// relative imports. Unit tests import the redaction functions; main() runs only when executed.

import { spawn } from 'node:child_process'
import { appendFileSync, createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { pathToFileURL } from 'node:url'

// --- Redaction -------------------------------------------------------------------------------
// Two layers: the exact values of secret environment variables, and patterns for anything
// secret-shaped that did not come from the environment (connection strings, JWTs, reset links,
// tokens in URLs, password fields).

const SECRET_ENV_NAME = /DATABASE_URL|SECRET|PASSWORD|TOKEN|_KEY$|_KEY_ID$/

/** The values to remove: every secret-named variable with a value long enough to be one. */
export function secretValues(env: Record<string, string | undefined>): string[] {
  return Object.entries(env)
    .filter(([name, value]) => SECRET_ENV_NAME.test(name) && typeof value === 'string' && value.length >= 8)
    .map(([, value]) => value as string)
    .sort((a, b) => b.length - a.length) // longest first, so a value inside another is not left half-done
}

const PATTERNS: [RegExp, string][] = [
  [/\bpostgres(?:ql)?:\/\/\S+/gi, 'postgres://[redacted]'],
  [/\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g, '[redacted-jwt]'],
  [/(\/reset(?:-password)?\/)[\w.-]{8,}/gi, '$1[redacted]'],
  [/([?&](?:token|code|key|secret|password)=)[^&\s"']+/gi, '$1[redacted]'],
  [/("(?:password|token|secret|hash|salt|resetPasswordToken)"\s*:\s*")[^"]*(")/gi, '$1[redacted]$2'],
]

export function redact(line: string, secrets: string[]): string {
  let out = line
  for (const secret of secrets) out = out.split(secret).join('[redacted]')
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement)
  return out
}

// --- Server ----------------------------------------------------------------------------------

const LOG_FILE = path.resolve('test-results', 'e2e-db-server.log')
const PID_FILE = path.join(os.tmpdir(), 'ogserc-e2e-server.json')

function logLine(line: string): string {
  return `${new Date().toISOString()} ${redact(line, secretValues(process.env))}\n`
}

function fail(message: string): never {
  const line = `[test-server] ${message}`
  console.error(line)
  try {
    mkdirSync(path.dirname(LOG_FILE), { recursive: true })
    appendFileSync(LOG_FILE, logLine(line))
  } catch {
    // The console message is enough if the log cannot be written.
  }
  process.exit(1)
}

/** True if something accepts TCP connections on the port at this address. */
function isListening(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    socket.setTimeout(1000)
    socket.once('connect', () => (socket.destroy(), resolve(true)))
    socket.once('timeout', () => (socket.destroy(), resolve(true))) // no answer either way: treat as in use
    socket.once('error', () => resolve(false))
  })
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function previousServerPid(): number | null {
  try {
    const { pid } = JSON.parse(readFileSync(PID_FILE, 'utf8')) as { pid?: unknown }
    return typeof pid === 'number' ? pid : null
  } catch {
    return null
  }
}

/**
 * Why a new test server must not start, or null if the previous one has stopped. Called by
 * playwright.db.config.ts before anything else (Playwright's own "is the URL in use?" check waits
 * forever on a server that accepts connections but never answers), and again here before the reset.
 */
export async function previousServerProblem(port: number): Promise<string | null> {
  const previous = previousServerPid()
  if (previous !== null && previous !== process.pid && isRunning(previous)) {
    return (
      `The previous test server (process ${previous}) is still running. Stop it before running again ` +
      `(Windows: Stop-Process -Id ${previous}; macOS/Linux: kill ${previous}). Nothing was reset.`
    )
  }
  const listening = await Promise.all(['127.0.0.1', '::1'].map((host) => isListening(host, port)))
  if (listening.some(Boolean)) {
    return (
      `Something is already listening on port ${port}, possibly an earlier test server. Stop it before ` +
      `running again (Windows: Get-NetTCPConnection -LocalPort ${port}; macOS/Linux: lsof -i :${port}). ` +
      'Nothing was reset.'
    )
  }
  return null
}

/** What the reset confirmed ("host …, database …, no users"), or null if it wrote no confirmation. */
export function resetConfirmation(file: string): string | null {
  try {
    const { host, database, users } = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    if (typeof host !== 'string' || typeof database !== 'string' || users !== 0) return null
    return `host ${host}, database ${database}, no users`
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2]
  if (mode !== 'dev' && mode !== 'start') fail('Usage: test-server.ts <dev|start>')
  const port = Number(process.env.PORT)
  if (!Number.isInteger(port) || port <= 0) fail('PORT is not set.')

  mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  const log = createWriteStream(LOG_FILE, { flags: 'w' })
  const write = (line: string, toStderr = false): void => {
    ;(toStderr ? process.stderr : process.stdout).write(`${line}\n`)
    log.write(logLine(line))
  }

  /** Runs a command, copying its output line by line; resolves with its exit code. */
  const run = (command: string): Promise<number> =>
    new Promise((resolve) => {
      const child = spawn(command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
      readline.createInterface({ input: child.stdout }).on('line', (line) => write(line))
      readline.createInterface({ input: child.stderr }).on('line', (line) => write(line, true))
      child.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
    })

  const problem = await previousServerProblem(port)
  if (problem) fail(problem)
  writeFileSync(PID_FILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }))
  write(`[test-server] Port ${port} is free and no earlier test server is running. Log: ${LOG_FILE}`)

  // `payload run` has been seen to exit with code 0 without running the script (D-047), so the
  // reset counts only if it wrote its confirmation file. One retry; the reset is idempotent and
  // repeats every guard.
  const confirmFile = path.join(os.tmpdir(), `ogserc-e2e-reset-${process.pid}.json`)
  process.env.E2E_RESET_CONFIRM_FILE = confirmFile
  for (let attempt = 1; ; attempt++) {
    rmSync(confirmFile, { force: true })
    const resetCode = await run('pnpm payload run tests/support/reset-test-db.ts')
    if (resetCode !== 0) fail(`The test database reset failed (exit code ${resetCode}). The server was not started.`)
    const confirmed = resetConfirmation(confirmFile)
    rmSync(confirmFile, { force: true })
    if (confirmed) {
      write(`[test-server] Reset confirmed: ${confirmed}.`)
      break
    }
    const message = `The reset exited with code 0 but did not confirm that it ran (attempt ${attempt} of 2).`
    if (attempt === 2) fail(`${message} The server was not started.`)
    write(`[test-server] ${message} Retrying.`, true)
  }
  const serverCode = await run(`pnpm ${mode}`)
  rmSync(PID_FILE, { force: true })
  write(`[test-server] Server exited with code ${serverCode}.`)
  log.end(() => process.exit(serverCode))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
