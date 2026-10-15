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
