// Addresses of uploaded images for next/image (D-096).

const MEDIA_PATH = '/api/media/file/'

/**
 * The site-relative address of an uploaded image (`/api/media/file/…`), or undefined. Payload gives
 * a full URL when SITE_URL is set (its serverURL), which next/image refuses for an unlisted host;
 * the relative address is the one next.config.ts allows (`localPatterns`).
 */
export function mediaPath(url: string | null | undefined): string | undefined {
  return sitePath(url, MEDIA_PATH)
}

/** The site-relative address of an uploaded document file (`/api/document-files/file/…`, D-102). */
export function documentFilePath(url: string | null | undefined): string | undefined {
  return sitePath(url, DOCUMENT_FILE_PATH)
}

const DOCUMENT_FILE_PATH = '/api/document-files/file/'

function sitePath(url: string | null | undefined, prefix: string): string | undefined {
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
  return path.startsWith(prefix) ? path : undefined
}
