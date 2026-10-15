// Runs once when a Next.js server starts, before it handles requests. Payload's config is only
// loaded on first use, so without this an unsafe configuration would start a server that fails
// on every request instead of refusing to start.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { assertServerEnv } = await import('./lib/env')
  try {
    assertServerEnv(process.env)
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Refusing to start: unsafe configuration.')
    process.exit(1)
  }
}
