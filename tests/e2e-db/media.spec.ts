import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { type APIRequestContext, expect, request, test } from '@playwright/test'
import sharp from 'sharp'

import { createStaff, loadAdminAccount, signIn, type TestAccount, visitorAddress } from './support/auth'

// Media accepts only real JPEG, PNG, WebP and AVIF images of 10 MB or less, checked by content
// (NFR-SEC-08, D-045). Editors upload; only publishers and administrators replace or delete.
// Staff are told which rule failed; anyone else gets only the generic access error.
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

const NOT_AN_IMAGE = 'Only JPEG, PNG, WebP and AVIF images are accepted, and this file is none of them.'

/** Parts of the staff-only messages; none may ever reach someone who cannot upload. */
const RULE_DETAILS = /Only JPEG|sent as|its content is|images must be|Rename it/

async function expectRejected(response: Awaited<ReturnType<typeof upload>>, status = 400, message?: string) {
  expect(response.status()).toBe(status)
  const body = await response.text()
  expect(body).not.toMatch(/\bat\s+\S+\s+\(|node_modules/) // no stack trace
  if (message) expect(body).toContain(message)
}

async function expectGenericDenial(response: Awaited<ReturnType<typeof upload>>) {
  expect(response.status()).toBe(403)
  const body = await response.text()
  expect(body).not.toMatch(RULE_DETAILS)
  expect(body).not.toMatch(/\bat\s+\S+\s+\(|node_modules/)
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
  await expectRejected(await upload(editor, 'photo.heic', 'image/heic', HEIC), 400, NOT_AN_IMAGE)
  await expectRejected(await upload(editor, 'photo.heif', 'image/heif', HEIF), 400, NOT_AN_IMAGE)
  await expectRejected(await upload(editor, 'photo.avif', 'image/avif', HEIC), 400, NOT_AN_IMAGE)
  await expectRejected(await upload(editor, 'photo.avif', 'image/avif', HEIF), 400, NOT_AN_IMAGE)
})

test('an HTML file is rejected', async () => {
  await expectRejected(await upload(editor, 'page.html', 'text/html', HTML), 400, NOT_AN_IMAGE)
})

test('an SVG file is rejected', async () => {
  await expectRejected(await upload(editor, 'logo.svg', 'image/svg+xml', SVG), 400, NOT_AN_IMAGE)
})

test('an HTML file renamed .png and declared image/png is rejected', async () => {
  await expectRejected(await upload(editor, 'innocent.png', 'image/png', HTML), 400, NOT_AN_IMAGE)
})

test('a JPEG declared as a PNG is rejected, saying so', async () => {
  await expectRejected(
    await upload(editor, 'photo.png', 'image/png', await image('jpeg')),
    400,
    'The file was sent as image/png, but its content is a JPEG image.',
  )
})

test('a JPEG named .png is rejected, saying which names fit', async () => {
  await expectRejected(
    await upload(editor, 'photo.png', 'image/jpeg', await image('jpeg')),
    400,
    'The file name ends in .png, but its content is a JPEG image. Rename it to end in .jpg or .jpeg.',
  )
})

test('a real image just under 10 MB is accepted', async () => {
  const buffer = await largePng(1800)
  expect(buffer.length).toBeGreaterThan(9 * 1024 * 1024)
  expect(buffer.length).toBeLessThan(10 * 1024 * 1024)
  expect((await upload(editor, 'nearly-10mb.png', 'image/png', buffer)).status()).toBe(201)
})

test('a real image over 10 MB is rejected, saying how large it is', async () => {
  const buffer = await largePng(1900)
  expect(buffer.length).toBeGreaterThan(10 * 1024 * 1024)
  const size = Math.round((buffer.length / (1024 * 1024)) * 10) / 10
  await expectRejected(
    await upload(editor, 'large.png', 'image/png', buffer),
    400,
    `This image is ${size} MB; images must be 10 MB or smaller.`,
  )
})

test('someone signed out gets only the generic denial, never the rule that failed', async ({ baseURL }) => {
  const anonymous = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  try {
    await expectGenericDenial(await upload(anonymous, 'page.png', 'image/png', HTML))
    await expectGenericDenial(await upload(anonymous, 'photo.png', 'image/png', await image('jpeg')))
    await expectGenericDenial(await upload(anonymous, 'large.png', 'image/png', await largePng(1900)))
  } finally {
    await anonymous.dispose()
  }
})

test('an editor replacing a file gets only the generic denial', async () => {
  const response = await editor.patch(`/api/media/${uploadedId}`, {
    multipart: { file: { name: 'page.png', mimeType: 'image/png', buffer: HTML }, _payload: '{}' },
  })
  await expectGenericDenial(response)
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
  // Only this file's uploads (all described "[Test] image"); the content migration adds OGSERC's own (D-096).
  const response = await admin.get(`/api/media?where[alt][equals]=${encodeURIComponent('[Test] image')}&limit=0`)
  // The PNG, the three real files and the image just under 10 MB; none of the rejected ones.
  expect(((await response.json()) as { totalDocs: number }).totalDocs).toBe(1 + REAL_FILES.length + 1)
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
