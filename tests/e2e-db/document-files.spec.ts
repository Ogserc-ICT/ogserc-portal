import { randomBytes } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { type APIRequestContext, expect, request, test } from '@playwright/test'

import { docx, pdf, xlsx } from '../support/zip'
import { createStaff, loadAdminAccount, signIn, visitorAddress } from './support/auth'

// Document files (D-090): real PDF, Word (.docx) and Excel (.xlsx) files only, checked by content,
// macro-enabled Office files refused, 25 MB at most. Editors upload; only publishers replace or
// delete. Public from upload (D-089). Staff are told which rule failed; anyone else is not.
test.describe.configure({ mode: 'serial' })

const PDF = 'application/pdf'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const HTML = Buffer.from('<!doctype html><html><body><script>alert(document.cookie)</script></body></html>')

/** One of OGSERC's real registration forms: a genuine Word file. */
const realForm = () => {
  const folder = path.join('public', 'forms', 'registration')
  return readFileSync(path.join(folder, readdirSync(folder).find((name) => name.endsWith('.docx'))!))
}

let admin: APIRequestContext
let editor: APIRequestContext
let publisher: APIRequestContext
let uploaded: { id: number | string; filename: string; url: string }

const unique = (name: string) => `${randomBytes(4).toString('hex')}-${name}`

function upload(as: APIRequestContext, name: string, mimeType: string, buffer: Buffer) {
  return as.post('/api/document-files', {
    multipart: { file: { name, mimeType, buffer }, _payload: JSON.stringify({ title: '[Test] document file' }) },
  })
}

async function expectRejected(response: Awaited<ReturnType<typeof upload>>, message: string) {
  expect(response.status()).toBe(400)
  const body = await response.text()
  expect(body).toContain(message)
  expect(body).not.toMatch(/\bat\s+\S+\s+\(|node_modules/) // no stack trace
}

test.beforeAll(async ({ baseURL }) => {
  admin = await signIn(baseURL!, await loadAdminAccount())
  editor = await signIn(baseURL!, await createStaff(admin, 'files-editor', ['editor']))
  publisher = await signIn(baseURL!, await createStaff(admin, 'files-publisher', ['publisher']))
})

test.afterAll(async () => {
  await Promise.all([admin, editor, publisher].map((context) => context?.dispose()))
})

test('an editor uploads a PDF, stored in the test uploads folder only', async () => {
  const name = unique('order.pdf')
  const response = await upload(editor, name, PDF, pdf())
  expect(response.status()).toBe(201)
  uploaded = ((await response.json()) as { doc: typeof uploaded }).doc
  expect(uploaded.filename).toBe(name)
  expect(existsSync(path.join(process.env.E2E_MEDIA_DIR!, 'document-files', name))).toBe(true)
  expect(existsSync(path.resolve('document-files', name))).toBe(false)
})

test('the file is public as soon as it is uploaded (D-089)', async ({ baseURL }) => {
  const anonymous = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  try {
    const response = await anonymous.get(uploaded.url)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain(PDF)
  } finally {
    await anonymous.dispose()
  }
})

test("an editor uploads a real Word form and an Excel file", async () => {
  expect((await upload(editor, unique('form.docx'), DOCX, realForm())).status()).toBe(201)
  expect((await upload(editor, unique('rates.xlsx'), XLSX, xlsx())).status()).toBe(201)
})

test('a macro-enabled Word file is rejected, saying why', async () => {
  await expectRejected(await upload(editor, unique('form.docx'), DOCX, docx({ 'word/vbaProject.bin': 'macro' })), 'contains macros')
})

test('an HTML file disguised as a PDF is rejected', async () => {
  await expectRejected(await upload(editor, unique('notice.pdf'), PDF, HTML), 'Only PDF, Word (.docx) and Excel (.xlsx)')
})

test('a PDF declared as Word is rejected, saying so', async () => {
  await expectRejected(await upload(editor, unique('order.docx'), DOCX, pdf()), `The file was sent as ${DOCX}, but its content is a PDF file.`)
})

test('an editor cannot replace or delete a file; a publisher can', async () => {
  expect((await editor.patch(`/api/document-files/${uploaded.id}`, { data: { title: 'changed' } })).status()).toBe(403)
  expect((await editor.delete(`/api/document-files/${uploaded.id}`)).status()).toBe(403)
  expect((await publisher.patch(`/api/document-files/${uploaded.id}`, { data: { title: '[Test] renamed' } })).status()).toBe(200)
  expect((await publisher.delete(`/api/document-files/${uploaded.id}`)).status()).toBe(200)
})

test('someone signed out cannot upload, and is not told the rules', async ({ baseURL }) => {
  const anonymous = await request.newContext({ baseURL, extraHTTPHeaders: visitorAddress() })
  try {
    const response = await upload(anonymous, 'notice.pdf', PDF, HTML)
    expect(response.status()).toBe(403)
    expect(await response.text()).not.toMatch(/Only PDF|sent as|its content is|Rename it|macros/)
  } finally {
    await anonymous.dispose()
  }
})

test('uploads and changes are in the audit log', async () => {
  const response = await admin.get(
    `/api/audit-log?where[targetType][equals]=document-files&where[targetId][equals]=${uploaded.id}&sort=createdAt&depth=0`,
  )
  expect(response.status()).toBe(200)
  const { docs } = (await response.json()) as { docs: { action: string }[] }
  expect(docs.map((doc) => doc.action)).toEqual(['file.uploaded', 'file.updated', 'file.deleted'])
})
