import { startWithRetry } from './lib/boot'
import { assertServerEnv } from './lib/env'

/** Stops the server process if the configuration is unsafe (see lib/env.ts). */
export function refuseUnsafeConfig(): void {
  try {
    assertServerEnv(process.env)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Refusing to start: unsafe configuration.')
    process.exit(1)
  }
}

/**
 * In production, starts Payload before the server takes requests: Payload applies pending
 * migrations (prodMigrations), then the startup check verifies the schema (D-051). Payload would
 * otherwise start on the first request, and a failure there would fail every request instead of
 * stopping the server. Skipped during `next build`, which never connects to a database.
 */
export async function startPayloadAtBoot(): Promise<void> {
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') return
  const [{ getPayload }, { default: config }, { checkDatabaseAtStartup }] = await Promise.all([
    import('payload'),
    import('@payload-config'),
    import('./lib/startup'),
  ])
  await startWithRetry({
    start: async () => checkDatabaseAtStartup(await getPayload({ config })),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (message) => console.error(`[startup] ${message}`),
    exit: (code) => process.exit(code),
  })
}
