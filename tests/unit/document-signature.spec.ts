import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { detectDocumentType, documentUploadProblem, zipEntryNames } from '../../src/lib/uploads/document-signature'
import { MAX_DOCUMENT_BYTES, MAX_UPLOAD_BYTES } from '../../src/lib/uploads/limits'
import { docx, pdf, xlsx, zip } from '../support/zip'

// Document files are checked by content (NFR-SEC-08, D-090): PDF, Word (.docx) and Excel (.xlsx)
// only, Office files without macros, with a declared type and extension that agree.

const PDF = 'application/pdf'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const file = (data: Buffer, mimetype: string, name: string, size = data.length) => ({ data, mimetype, name, size })

test('the document limit is 25 MB, the upload ceiling', () => {
  expect(MAX_DOCUMENT_BYTES).toBe(25 * 1024 * 1024)
  expect(MAX_DOCUMENT_BYTES).toBeLessThanOrEqual(MAX_UPLOAD_BYTES)
})

test.describe('detectDocumentType', () => {
  test('recognises PDF, Word and Excel by their content', () => {
    expect(detectDocumentType(pdf())).toEqual({ type: PDF })
    expect(detectDocumentType(docx())).toEqual({ type: DOCX })
    expect(detectDocumentType(xlsx())).toEqual({ type: XLSX })
  })

  test("recognises OGSERC's real registration forms as Word files", () => {
    const folder = path.join('public', 'forms', 'registration')
    const forms = readdirSync(folder).filter((name) => name.endsWith('.docx'))
    expect(forms.length).toBeGreaterThan(0)
    for (const name of forms) expect(detectDocumentType(readFileSync(path.join(folder, name))), name).toEqual({ type: DOCX })
  })

  test('flags macro-enabled Office files', () => {
    expect(detectDocumentType(docx({ 'word/vbaProject.bin': 'macro' }))).toEqual({ macros: true })
    expect(detectDocumentType(xlsx({ 'xl/vbaProject.bin': 'macro' }))).toEqual({ macros: true })
    expect(detectDocumentType(docx({ 'word/VBAPROJECT.BIN': 'macro' }))).toEqual({ macros: true })
  })

  test('rejects other ZIP files, damaged files and other formats', () => {
    expect(detectDocumentType(zip({ 'readme.txt': 'hello' }))).toBeNull()
    expect(detectDocumentType(zip({ '[Content_Types].xml': '<Types/>', 'ppt/presentation.xml': '<p/>' }))).toBeNull()
    expect(detectDocumentType(docx().subarray(0, 60))).toBeNull() // cut short: no directory
    expect(detectDocumentType(Buffer.from('<!doctype html><script>alert(1)</script>'))).toBeNull()
    expect(detectDocumentType(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBeNull() // old .doc
    expect(detectDocumentType(Buffer.alloc(0))).toBeNull()
  })
})

test('zipEntryNames lists the central directory, and refuses a directory pointing past its end', () => {
  expect(zipEntryNames(zip({ a: '1', 'b/c': '2' }))).toEqual(['a', 'b/c'])
  const broken = zip({ a: '1' })
  broken.writeUInt32LE(broken.length, broken.length - 6) // directory offset beyond the end record
  expect(zipEntryNames(broken)).toBeNull()
})

test.describe('documentUploadProblem', () => {
  test('accepts real files with the right type and extension', () => {
    expect(documentUploadProblem(file(pdf(), PDF, 'order.pdf'), MAX_DOCUMENT_BYTES)).toBeNull()
    expect(documentUploadProblem(file(docx(), DOCX, 'Form.DOCX'), MAX_DOCUMENT_BYTES)).toBeNull()
    expect(documentUploadProblem(file(xlsx(), `${XLSX}; charset=binary`, 'rates.xlsx'), MAX_DOCUMENT_BYTES)).toBeNull()
  })

  test('says which rule failed', () => {
    expect(documentUploadProblem(file(pdf(), PDF, 'big.pdf', 26 * 1024 * 1024), MAX_DOCUMENT_BYTES)).toBe(
      'This file is 26 MB; document files must be 25 MB or smaller.',
    )
    expect(documentUploadProblem(file(docx({ 'word/vbaProject.bin': 'x' }), DOCX, 'a.docx'), MAX_DOCUMENT_BYTES)).toContain('contains macros')
    expect(documentUploadProblem(file(Buffer.from('<html>'), PDF, 'a.pdf'), MAX_DOCUMENT_BYTES)).toContain('Only PDF, Word (.docx) and Excel (.xlsx)')
    expect(documentUploadProblem(file(pdf(), DOCX, 'a.docx'), MAX_DOCUMENT_BYTES)).toBe(`The file was sent as ${DOCX}, but its content is a PDF file.`)
    expect(documentUploadProblem(file(pdf(), 'text/html<script>', 'a.pdf'), MAX_DOCUMENT_BYTES)).toBe(
      'The file was sent as an unrecognised type, but its content is a PDF file.',
    )
    expect(documentUploadProblem(file(pdf(), PDF, 'a.exe'), MAX_DOCUMENT_BYTES)).toBe(
      'The file name ends in .exe, but its content is a PDF file. Rename it to end in .pdf.',
    )
    expect(documentUploadProblem(file(xlsx(), XLSX, 'rates'), MAX_DOCUMENT_BYTES)).toBe(
      'The file name has no extension, but its content is an Excel (.xlsx) file. Rename it to end in .xlsx.',
    )
  })
})
