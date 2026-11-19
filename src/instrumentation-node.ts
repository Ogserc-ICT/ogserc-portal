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
 *
 * It uses its own Payload instance and closes it afterwards, never getPayload. The instrumentation
 * bundle has its own copy of Payload and of the config, and getPayload caches on a process-wide
 * global, so an instance created here would be the one every route handler uses: errors thrown
 * by its hooks would then be this copy's classes, which the routes' error formatting does not
 * recognise, and Payload's response would lose its details (D-051). Route handlers start their own
 * instance on the first request, as without this check; the migrations have already run by then.
 */
export async function startPayloadAtBoot(): Promise<void> {
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') return
  const [{ BasePayload }, { default: config }, { checkDatabaseAtStartup }] = await Promise.all([
    import('payload'),
    import('@payload-config'),
    import('./lib/startup'),
  ])
  await startWithRetry({
    start: async () => {
      const payload = new BasePayload()
      try {
        await payload.init({ config })
        await checkDatabaseAtStartup(payload)
      } finally {
        // Closes the connection pool, also after a failed attempt.
        await payload.destroy().catch(() => {})
      }
    },
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (message) => console.error(`[startup] ${message}`),
    exit: (code) => process.exit(code),
  })
}
