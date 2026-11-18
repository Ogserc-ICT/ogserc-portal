/**
 * Privacy-friendly visitor statistics (FR-WEB-07, D-077): Umami, self-hosted on OGSERC's server.
 * Caddy serves the script and the endpoint it reports to from the site's own address, so nothing
 * loads from another domain. It sets no cookies and builds no visitor profiles.
 */

export const ANALYTICS_SCRIPT_PATH = '/pulse/p.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The Umami website ID, or null when statistics are off (development, previews, CI without it).
 * Static pages read it at build time, so the Docker build receives it as a build argument.
 */
function websiteId(): string | null {
  const id = process.env.UMAMI_WEBSITE_ID?.trim()
  return id && UUID.test(id) ? id : null
}

export function Analytics() {
  const id = websiteId()
  if (!id) return null
  // data-do-not-track: browsers that send Do Not Track are not counted at all.
  return <script defer src={ANALYTICS_SCRIPT_PATH} data-website-id={id} data-do-not-track="true" />
}
