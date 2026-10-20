// Starts Payload when a production server boots (src/instrumentation-node.ts) and decides what to
// do if that fails (D-051). Pure: the start, the wait, the log and the exit are passed in, so the
// rules are unit-tested (tests/unit/boot.spec.ts).
//
// Every message here is fixed text plus attempt counts. None repeats an error's own message, which
// could name the database user; Payload logs its own errors.

export const MAX_ATTEMPTS = 6
/** Waits between attempts: about 30 seconds in all, enough for a brief outage or a restart. */
export const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000]

const SCHEMA_INCOMPLETE = 'SCHEMA_INCOMPLETE'

/** Thrown by the startup check when tables or migration records are missing. */
export class SchemaIncompleteError extends Error {
  readonly code = SCHEMA_INCOMPLETE
  constructor() {
    super('The database schema is incomplete.')
  }
}

export type StartFailure = 'schema-incomplete' | 'database-missing' | 'database-unreachable' | 'other'

/** Payload's Postgres adapter wraps every connection failure as "cannot connect to Postgres: …". */
export function classifyStartError(error: unknown): StartFailure {
  // Checked by code, not class: the error may come from another bundle's copy of this module.
  if ((error as { code?: unknown } | null)?.code === SCHEMA_INCOMPLETE) return 'schema-incomplete'
  const message = error instanceof Error ? error.message : ''
  if (!/cannot connect to Postgres/i.test(message)) return 'other'
  // With disableCreateDatabase, a missing database is reported, not created. Waiting won't help.
  if (/database .* does not exist/i.test(message)) return 'database-missing'
  return 'database-unreachable'
}

export const REFUSALS: Record<StartFailure, string> = {
  'schema-incomplete': 'Refusing to start: the database schema is incomplete (the error above names what is missing).',
  'database-missing':
    'Refusing to start: the database named in DATABASE_URL does not exist. Create it first (docs/RUNBOOK.md Section 3).',
  'database-unreachable': `Refusing to start: the database could not be reached after ${MAX_ATTEMPTS} attempts.`,
  other: 'Refusing to start: Payload failed to start (see the error above).',
}

export type BootSteps = {
  start: () => Promise<unknown>
  sleep: (ms: number) => Promise<void>
  log: (message: string) => void
  exit: (code: number) => void
}

/**
 * Runs `start`. An unreachable database is retried with growing waits; anything else that fails
 * stops the process at once. Returns true once started.
 */
export async function startWithRetry({ start, sleep, log, exit }: BootSteps): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    try {
      await start()
      if (attempt > 1) log(`Database reachable; started on attempt ${attempt} of ${MAX_ATTEMPTS}.`)
      return true
    } catch (error) {
      const failure = classifyStartError(error)
      if (failure === 'database-unreachable' && attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1]!
        log(`Database not reachable (attempt ${attempt} of ${MAX_ATTEMPTS}); retrying in ${delay / 1000}s.`)
        await sleep(delay)
        continue
      }
      log(REFUSALS[failure])
      exit(1)
      return false
    }
  }
}
