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

/** A small valid image. */
const image = (format: 'png' | 'jpeg') =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: '#1D7248' } })[format]().toBuffer()

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
  expect(((await response.json()) as { totalDocs: number }).totalDocs).toBe(1)
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
