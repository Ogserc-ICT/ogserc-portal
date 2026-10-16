// Identifies an image by its first bytes (its "magic number"), not by the name or type the browser
// sent. Payload checks content too, but when it cannot recognise the bytes (plain HTML, for
// example) it falls back to the file extension; this check never does (NFR-SEC-08, D-045).

export const IMAGE_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/avif': ['avif'],
} as const

export type ImageType = keyof typeof IMAGE_TYPES

/** The only types the Media collection accepts. No wildcard and no SVG (SVG can carry script). */
export const IMAGE_MIME_TYPES = Object.keys(IMAGE_TYPES) as ImageType[]

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
// AVIF still images use major brand `avif`, image sequences `avis`, and some encoders write the
// generic HEIF brand `mif1`. HEIC (HEVC-coded HEIF) also uses `mif1`, so `avif` must be listed among
// the compatible brands as well: that is what makes the file AVIF rather than HEIC.
const AVIF_MAJOR_BRANDS = ['avif', 'avis', 'mif1']
const AVIF_COMPATIBLE_BRAND = 'avif'

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte)
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end))
}

/**
 * AVIF is an ISO-BMFF file whose `ftyp` box has major brand `avif`, `avis` or `mif1` and lists
 * `avif` among its compatible brands. HEIC and plain HEIF files fail one test or the other.
 */
function isAvif(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 8) !== 'ftyp') return false
  const boxSize = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0
  const end = Math.min(boxSize, bytes.length)
  const major = ascii(bytes, 8, 12)
  const compatible: string[] = []
  // Bytes 12-16 are the minor version; compatible brands follow, four bytes each.
  for (let offset = 16; offset + 4 <= end; offset += 4) compatible.push(ascii(bytes, offset, offset + 4))
  return AVIF_MAJOR_BRANDS.includes(major) && compatible.includes(AVIF_COMPATIBLE_BRAND)
}

/** The image type the bytes actually contain, or null if they are not one of the accepted types. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png'
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp'
  if (isAvif(bytes)) return 'image/avif'
  return null
}

export type UploadedFile = { data: Uint8Array; mimetype: string; name: string; size: number }

/**
 * Why an uploaded file is not an acceptable image, or null if it is. The bytes must be one of the
 * accepted types, and the declared type and file extension must both agree with them.
 */
export function imageUploadProblem(file: UploadedFile, maxBytes: number): string | null {
  if (file.size > maxBytes) return `Images must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`
  const detected = detectImageType(file.data)
  if (!detected) return 'Only JPEG, PNG, WebP and AVIF images can be uploaded.'
  const declared = file.mimetype.split(';')[0]!.trim().toLowerCase()
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  const allowedExtensions: readonly string[] = IMAGE_TYPES[detected]
  if (declared !== detected || !allowedExtensions.includes(extension)) {
    return 'The file type, name and content do not match.'
  }
  return null
}
