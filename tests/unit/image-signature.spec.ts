import { expect, test } from '@playwright/test'

import { detectImageType, imageUploadProblem } from '../../src/lib/uploads/image-signature'

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((part) => (typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : part)))

/** An ISO-BMFF `ftyp` box: size, "ftyp", major brand, minor version 0, compatible brands. */
const ftyp = (major: string, ...compatible: string[]) =>
  bytes([0, 0, 0, 16 + 4 * compatible.length], 'ftyp', major, [0, 0, 0, 0], ...compatible)

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], 'JFIF')
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d], 'IHDR')
const WEBP = bytes('RIFF', [0x24, 0, 0, 0], 'WEBPVP8 ')
// What sharp's AVIF encoder writes (checked against a real file in tests/e2e-db/media.spec.ts).
const AVIF = ftyp('avif', 'mif1', 'avif', 'miaf')
const AVIF_COMPATIBLE = ftyp('mif1', 'mif1', 'avif')
const HEIC = ftyp('heic', 'mif1', 'heic')
const HTML = bytes('<!doctype html><html><script>alert(1)</script></html>')
const SVG = bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

const MB = 1024 * 1024
const file = (data: Uint8Array, mimetype: string, name: string, size = data.length) => ({ data, mimetype, name, size })

test.describe('detectImageType', () => {
  test('recognises the four accepted formats by their bytes', () => {
    expect(detectImageType(JPEG)).toBe('image/jpeg')
    expect(detectImageType(PNG)).toBe('image/png')
    expect(detectImageType(WEBP)).toBe('image/webp')
    expect(detectImageType(AVIF)).toBe('image/avif')
    expect(detectImageType(AVIF_COMPATIBLE)).toBe('image/avif')
  })

  test('recognises nothing else', () => {
    for (const other of [HTML, SVG, HEIC, bytes('RIFF', [0, 0, 0, 0], 'WAVE'), bytes([0xff, 0xd8]), new Uint8Array()]) {
      expect(detectImageType(other)).toBeNull()
    }
  })
})

test.describe('AVIF brands', () => {
  test('accepts major brand avif, avis or mif1 when avif is a compatible brand', () => {
    expect(detectImageType(ftyp('avif', 'avif'))).toBe('image/avif')
    expect(detectImageType(ftyp('avis', 'avis', 'avif', 'msf1'))).toBe('image/avif')
    expect(detectImageType(ftyp('mif1', 'mif1', 'avif', 'miaf'))).toBe('image/avif')
  })

  test('rejects a file without avif among the compatible brands', () => {
    expect(detectImageType(ftyp('avif', 'mif1', 'miaf'))).toBeNull()
    expect(detectImageType(ftyp('mif1', 'mif1', 'miaf'))).toBeNull()
    expect(detectImageType(ftyp('avis', 'avis', 'msf1'))).toBeNull()
  })

  test('rejects HEIC and HEIF, even when they also list avif', () => {
    expect(detectImageType(HEIC)).toBeNull()
    expect(detectImageType(ftyp('mif1', 'mif1', 'heic'))).toBeNull() // HEIF
    expect(detectImageType(ftyp('heix', 'mif1', 'heix'))).toBeNull()
    expect(detectImageType(ftyp('msf1', 'msf1', 'hevc'))).toBeNull() // HEIF sequence
    expect(detectImageType(ftyp('heic', 'mif1', 'heic', 'avif'))).toBeNull()
  })

  test('reads compatible brands only inside the ftyp box', () => {
    // Box size says no compatible brands; an "avif" just after the box must not count.
    expect(detectImageType(bytes([0, 0, 0, 16], 'ftyp', 'mif1', [0, 0, 0, 0], 'avif'))).toBeNull()
  })
})

test.describe('imageUploadProblem', () => {
  test('accepts a real image whose type and extension agree', () => {
    expect(imageUploadProblem(file(PNG, 'image/png', 'photo.png'), 5 * MB)).toBeNull()
    expect(imageUploadProblem(file(JPEG, 'image/jpeg', 'Photo.JPG'), 5 * MB)).toBeNull()
    expect(imageUploadProblem(file(JPEG, 'image/jpeg', 'photo.jpeg'), 5 * MB)).toBeNull()
  })

  test('rejects HTML and SVG, whatever they are called', () => {
    expect(imageUploadProblem(file(HTML, 'text/html', 'page.html'), 5 * MB)).toMatch(/Only JPEG/)
    expect(imageUploadProblem(file(HTML, 'image/png', 'page.png'), 5 * MB)).toMatch(/Only JPEG/)
    expect(imageUploadProblem(file(SVG, 'image/svg+xml', 'logo.svg'), 5 * MB)).toMatch(/Only JPEG/)
  })

  test('rejects a declared type or extension that disagrees with the content', () => {
    expect(imageUploadProblem(file(JPEG, 'image/png', 'photo.png'), 5 * MB)).toMatch(/do not match/)
    expect(imageUploadProblem(file(JPEG, 'image/jpeg', 'photo.png'), 5 * MB)).toMatch(/do not match/)
    expect(imageUploadProblem(file(PNG, 'image/png', 'photo'), 5 * MB)).toMatch(/do not match/)
  })

  test('rejects images over the size limit', () => {
    expect(imageUploadProblem(file(PNG, 'image/png', 'big.png', 5 * MB + 1), 5 * MB)).toMatch(/5 MB or smaller/)
    expect(imageUploadProblem(file(PNG, 'image/png', 'edge.png', 5 * MB), 5 * MB)).toBeNull()
  })
})
