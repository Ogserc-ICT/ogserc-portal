// Which links from the CMS may be followed (D-096): a page of this site, an anchor, https, email or
// phone. Anything else (javascript:, data:, http:, //host) is shown as plain text.

/** The address if it is safe to link to, otherwise null. */
export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string' || url === '') return null
  if (url.startsWith('/') && !url.startsWith('//')) return url
  if (url.startsWith('#')) return url
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:' ? url : null
  } catch {
    return null
  }
}
