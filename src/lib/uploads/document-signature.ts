// Identifies a document file (PDF, Word, Excel) by its content, not by the name or type the browser
// sent, like image-signature.ts does for images (NFR-SEC-08, D-045, D-090). Word and Excel files are
// ZIP archives; their list of entries must be that of a real .docx or .xlsx, and macro-enabled files
// (an entry named vbaProject.bin) are refused.

export const DOCUMENT_TYPES = {
  'application/pdf': { extensions: ['pdf'], label: 'a PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extensions: ['docx'], label: 'a Word (.docx)' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extensions: ['xlsx'], label: 'an Excel (.xlsx)' },
} as const

export type DocumentType = keyof typeof DOCUMENT_TYPES

/** The only types the document-files collection accepts. */
export const DOCUMENT_MIME_TYPES = Object.keys(DOCUMENT_TYPES) as DocumentType[]

const PDF_SIGNATURE = '%PDF-'
const ZIP_LOCAL_HEADER = 0x04034b50
const ZIP_END_OF_DIRECTORY = 0x06054b50
const ZIP_DIRECTORY_ENTRY = 0x02014b50
/** The end record is 22 bytes plus a comment of up to 65,535 bytes. */
const MAX_END_RECORD_SEARCH = 22 + 0xffff
const MAX_ENTRIES = 10_000

const u16 = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8)
const u32 = (b: Uint8Array, at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0
const ascii = (b: Uint8Array, start: number, end: number) => String.fromCharCode(...b.subarray(start, end))

/**
 * The names of the entries in a ZIP archive's central directory, or null if it is not a ZIP this
 * check can read (damaged, split, or ZIP64, which no Word or Excel file under 25 MB needs).
 */
export function zipEntryNames(bytes: Uint8Array): string[] | null {
  if (bytes.length < 22 || u32(bytes, 0) !== ZIP_LOCAL_HEADER) return null
  const searchFrom = Math.max(0, bytes.length - MAX_END_RECORD_SEARCH)
  let end = -1
  for (let at = bytes.length - 22; at >= searchFrom; at--) {
    if (u32(bytes, at) === ZIP_END_OF_DIRECTORY) {
      end = at
      break
    }
  }
  if (end < 0) return null
  const count = u16(bytes, end + 10)
  const size = u32(bytes, end + 12)
  const offset = u32(bytes, end + 16)
  if (count === 0xffff || size === 0xffffffff || offset === 0xffffffff || count > MAX_ENTRIES) return null
  if (offset + size > end) return null
  const names: string[] = []
  let at = offset
  for (let n = 0; n < count; n++) {
    if (at + 46 > end || u32(bytes, at) !== ZIP_DIRECTORY_ENTRY) return null
    const nameLength = u16(bytes, at + 28)
    const next = at + 46 + nameLength + u16(bytes, at + 30) + u16(bytes, at + 32)
    if (next > end) return null
    names.push(ascii(bytes, at + 46, at + 46 + nameLength))
    at = next
  }
  return names
}

const DOCUMENT_TYPES_BY_LABEL = {
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const satisfies Record<string, DocumentType>

type Detected = { type: DocumentType } | { macros: true } | null

/** The document type the bytes contain, `{ macros: true }` for a macro-enabled Office file, or null. */
export function detectDocumentType(bytes: Uint8Array): Detected {
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === PDF_SIGNATURE) return { type: 'application/pdf' }
  const names = zipEntryNames(bytes)
  if (!names || !names.includes('[Content_Types].xml')) return null
  const lower = names.map((name) => name.toLowerCase())
  if (lower.some((name) => name.endsWith('vbaproject.bin'))) return { macros: true }
  if (names.includes('word/document.xml')) return { type: DOCUMENT_TYPES_BY_LABEL.word }
  if (names.includes('xl/workbook.xml')) return { type: DOCUMENT_TYPES_BY_LABEL.excel }
  return null
}

export type UploadedFile = { data: Uint8Array; mimetype: string; name: string; size: number }

const MEDIA_TYPE_PATTERN = /^[a-z0-9][a-z0-9.+-]{0,40}\/[a-z0-9][a-z0-9.+-]{0,80}$/

const megabytes = (bytes: number): string => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`

/**
 * Why an uploaded file is not an acceptable document, or null if it is. Each message names the rule
 * that failed, for signed-in staff only (the collection's hook never shows them to anyone else).
 */
export function documentUploadProblem(file: UploadedFile, maxBytes: number): string | null {
  if (file.size > maxBytes) {
    return `This file is ${megabytes(file.size)}; document files must be ${megabytes(maxBytes)} or smaller.`
  }
  const detected = detectDocumentType(file.data)
  if (detected && 'macros' in detected) {
    return 'This Office file contains macros, which are not accepted. Save it as an ordinary .docx or .xlsx file first.'
  }
  if (!detected) {
    return 'Only PDF, Word (.docx) and Excel (.xlsx) files are accepted, and this file is none of them. Older .doc and .xls files must be saved in the newer format first.'
  }
  const { label, extensions } = DOCUMENT_TYPES[detected.type]
  const declared = file.mimetype.split(';')[0]!.trim().toLowerCase()
  if (declared !== detected.type) {
    const shown = MEDIA_TYPE_PATTERN.test(declared) ? declared : 'an unrecognised type'
    return `The file was sent as ${shown}, but its content is ${label} file.`
  }
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  if (!(extensions as readonly string[]).includes(extension)) {
    const actual = extension ? `ends in .${extension}` : 'has no extension'
    return `The file name ${actual}, but its content is ${label} file. Rename it to end in .${extensions[0]}.`
  }
  return null
}
