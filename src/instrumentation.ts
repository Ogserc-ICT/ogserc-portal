// Runs once when a Next.js server starts, before it handles requests. Payload's config is only
// loaded on first use, so without this an unsafe configuration would start a server that fails
// on every request instead of refusing to start. The check uses Node.js APIs, so it lives in a
// separate file that the Edge runtime never loads.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { refuseUnsafeConfig } = await import('./instrumentation-node')
    refuseUnsafeConfig()
  }
}
