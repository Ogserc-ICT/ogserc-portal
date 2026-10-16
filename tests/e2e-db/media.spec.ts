import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { type APIRequestContext, expect, test } from '@playwright/test'
import sharp from 'sharp'

import { createStaff, loadAdminAccount, signIn, type TestAccount } from './support/auth'

// Media accepts only real JPEG, PNG, WebP and AVIF images of 5 MB or less, checked by content
// (NFR-SEC-08, D-045). Editors upload; only publishers and administrators replace or delete.
test.describe.configure({ mode: 'serial' })

const HTML = Buffer.from('<!doctype html><html><body><script>alert(document.cookie)</script></body></html>')
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

type Format = 'jpeg' | 'png' | 'webp' | 'avif'

/** A small real image, written by sharp's own encoder for the format. */
const image = (format: Format) =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: '#1D7248' } })[format]().toBuffer()

/** An ISO-BMFF `ftyp` header. sharp cannot encode HEVC, so HEIC and HEIF files are built by hand. */
const ftyp = (major: string, ...compatible: string[]) => {
  const header = Buffer.alloc(16 + 4 * compatible.length)
  header.writeUInt32BE(header.length, 0)
  header.write(`ftyp${major}\0\0\0\0${compatible.join('')}`, 4, 'latin1')
  return Buffer.concat([header, Buffer.from([0, 0, 0, 8]), Buffer.from('mdat', 'latin1')])
}
const HEIC = ftyp('heic', 'mif1', 'heic')
const HEIF = ftyp('mif1', 'mif1', 'heic')

/** A valid PNG of random pixels, stored uncompressed, so its size is about width × height × 3 bytes. */
const largePng = (side: number) =>
  sharp(randomBytes(side * side * 3), { raw: { width: side, height: side, channels: 3 } })
    .png({ compressionLevel: 0 })
    .toBuffer()

let editorAccount: TestAccount
let admin: APIRequestContext
let editor: APIRequestContext
let publisher: APIRequestContext
let uploadedId: string | number

function upload(as: APIRequestContext, name: string, mimeType: string, buffer: Buffer) {
  return as.post('/api/media', {
    multipart: { file: { name, mimeType, buffer }, _payload: JSON.stringify({ alt: '[Test] image' }) },
  })
}

async function expectRejected(response: Awaited<ReturnType<typeof upload>>, status = 400) {
  expect(response.status()).toBe(status)
  const body = await response.text()
  expect(body).not.toMatch(/\bat\s+\S+\s+\(|node_modules/) // no stack trace
}

test.beforeAll(async ({ baseURL }) => {
  admin = await signIn(baseURL!, await loadAdminAccount())
  editorAccount = await createStaff(admin, 'editor', ['editor'])
  editor = await signIn(baseURL!, editorAccount)
  publisher = await signIn(baseURL!, await createStaff(admin, 'publisher', ['publisher']))
})

test.afterAll(async () => {
  await Promise.all([admin, editor, publisher].map((context) => context?.dispose()))
})

test('an editor can upload a real PNG, stored in the test uploads folder only', async () => {
  // A unique name, so the check below cannot be confused by an older file of the same name.
  const name = `sample-${randomBytes(4).toString('hex')}.png`
  const response = await upload(editor, name, 'image/png', await image('png'))
  expect(response.status()).toBe(201)
  const { doc } = (await response.json()) as { doc: { id: string | number; filename: string } }
  uploadedId = doc.id
  expect(doc.filename).toBe(name)
  expect(existsSync(path.join(process.env.E2E_MEDIA_DIR!, name))).toBe(true)
  expect(existsSync(path.resolve('media', name))).toBe(false)
})

const REAL_FILES: [Format, string, string][] = [
  ['jpeg', 'photo.jpg', 'image/jpeg'],
  ['webp', 'photo.webp', 'image/webp'],
  ['avif', 'photo.avif', 'image/avif'],
]

for (const [format, name, mimeType] of REAL_FILES) {
  test(`an editor can upload a real ${format.toUpperCase()} file`, async () => {
    const buffer = await image(format)
    if (format === 'avif') {
      // Guards the fixture: a real AVIF file starts with an ftyp box naming the avif brand.
      expect(buffer.toString('latin1', 4, 8)).toBe('ftyp')
      expect(buffer.subarray(0, buffer.readUInt32BE(0)).toString('latin1')).toContain('avif')
    }
    expect((await upload(editor, name, mimeType, buffer)).status()).toBe(201)
  })
}

test('HEIC and HEIF files are rejected, as themselves or disguised as AVIF', async () => {
  await expectRejected(await upload(editor, 'photo.heic', 'image/heic', HEIC))
  await expectRejected(await upload(editor, 'photo.heif', 'image/heif', HEIF))
  await expectRejected(await upload(editor, 'photo.avif', 'image/avif', HEIC))
  await expectRejected(await upload(editor, 'photo.avif', 'image/avif', HEIF))
})

test('an HTML file is rejected', async () => {
  await expectRejected(await upload(editor, 'page.html', 'text/html', HTML))
})

test('an SVG file is rejected', async () => {
  await expectRejected(await upload(editor, 'logo.svg', 'image/svg+xml', SVG))
})

test('an HTML file renamed .png and declared image/png is rejected', async () => {
  await expectRejected(await upload(editor, 'innocent.png', 'image/png', HTML))
})

test('a JPEG declared and named as a PNG is rejected', async () => {
  await expectRejected(await upload(editor, 'photo.png', 'image/png', await image('jpeg')))
})

test('a real image over 5 MB is rejected', async () => {
  const buffer = await largePng(1400)
  expect(buffer.length).toBeGreaterThan(5 * 1024 * 1024)
  await expectRejected(await upload(editor, 'large.png', 'image/png', buffer))
})

test('a file over the 25 MB upload ceiling is refused while it is read', async ({ baseURL }) => {
  const buffer = await largePng(3000)
  expect(buffer.length).toBeGreaterThan(25 * 1024 * 1024)
  // Its own connection: the server answers 413 before the client has finished sending, which
  // leaves that keep-alive connection unusable for the client's next request.
  const uploader = await signIn(baseURL!, editorAccount)
  try {
    await expectRejected(await upload(uploader, 'huge.png', 'image/png', buffer), 413)
  } finally {
    await uploader.dispose()
  }
})

test('rejected uploads leave nothing behind', async () => {
  const response = await admin.get('/api/media')
  // The PNG plus the three real files above; none of the rejected ones.
  expect(((await response.json()) as { totalDocs: number }).totalDocs).toBe(1 + REAL_FILES.length)
})

test('an editor cannot replace or edit an image; a publisher can', async () => {
  const asEditor = await editor.patch(`/api/media/${uploadedId}`, { data: { alt: '[Test] changed by editor' } })
  expect(asEditor.status()).toBe(403)
  const asPublisher = await publisher.patch(`/api/media/${uploadedId}`, { data: { alt: '[Test] changed by publisher' } })
  expect(asPublisher.status()).toBe(200)
})

test('a publisher can delete an image', async () => {
  const response = await publisher.delete(`/api/media/${uploadedId}`)
  expect(response.status()).toBe(200)
})
