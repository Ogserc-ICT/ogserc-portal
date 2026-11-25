// Addresses of uploaded images for next/image (D-096).

const MEDIA_PATH = '/api/media/file/'

/**
 * The site-relative address of an uploaded image (`/api/media/file/…`), or undefined. Payload gives
 * a full URL when SITE_URL is set (its serverURL), which next/image refuses for an unlisted host;
 * the relative address is the one next.config.ts allows (`localPatterns`).
 */
export function mediaPath(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  let path = url
  if (!url.startsWith('/')) {
    try {
      const parsed = new URL(url)
      path = parsed.pathname + parsed.search
    } catch {
      return undefined
    }
  }
  return path.startsWith(MEDIA_PATH) ? path : undefined
}
