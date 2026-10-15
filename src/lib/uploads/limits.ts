// Upload size limits (NFR-SEC-08, D-045).

const MB = 1024 * 1024

/**
 * Largest file Payload accepts in any upload, enforced while the request is read (413 above it).
 * Sized for Step 4 PDFs; the PDF limit itself is an open question for OGSERC.
 */
export const MAX_UPLOAD_BYTES = 25 * MB

/** Largest image the Media collection accepts. */
export const MAX_IMAGE_BYTES = 5 * MB
