// Upload size limits (NFR-SEC-08, D-045).

const MB = 1024 * 1024

/**
 * Largest file Payload accepts in any upload, enforced while the request is read (413 above it).
 * Sized for document files (MAX_DOCUMENT_BYTES).
 */
export const MAX_UPLOAD_BYTES = 25 * MB

/**
 * Largest image the Media collection accepts. OGSERC may change this; it must stay at or below
 * MAX_UPLOAD_BYTES.
 */
export const MAX_IMAGE_BYTES = 10 * MB

/**
 * Largest PDF, Word or Excel file the document-files collection accepts: the upload ceiling, until
 * OGSERC gives a number (owner, 2026-11-23). Must stay at or below MAX_UPLOAD_BYTES.
 */
export const MAX_DOCUMENT_BYTES = MAX_UPLOAD_BYTES
