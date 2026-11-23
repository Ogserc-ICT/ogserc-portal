// Sample content for `pnpm seed` (FR-CMS-08, CLAUDE.md, D-094): clearly marked placeholder items of
// every content type, so every page can be reviewed before OGSERC supplies real content. Every title
// carries SAMPLE_MARK, and nothing here is regulatory content: no real fees, tariffs, licences,
// dates of real events or legal text. Pure data, so the rules can be unit tested.

import { deflateSync } from 'node:zlib'

import { DOCUMENT_CATEGORIES } from '../../collections/Documents'

/** In every sample title; also how the seed recognises items it made itself. */
export const SAMPLE_MARK = '[Sample'
export const sample = (what: string) => `[Sample ${what}, OGSERC to supply]`

/** Rich text (Payload's Lexical format): one paragraph per string. */
export function richText(...paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }],
      })),
    },
  }
}

const day = (iso: string) => `${iso}T00:00:00.000Z`

/** A real, valid PDF of one blank page whose title says it is a sample (Payload checks PDFs). */
export function samplePdf(label: string): Buffer {
  const title = label.replace(/[()\\]/g, '')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>',
    `<< /Title (${title}) >>`,
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((object, n) => {
    offsets.push(Buffer.byteLength(body))
    body += `${n + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(body)
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (data: Buffer) => {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])))
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, crc])
}

/**
 * A plain PNG in one colour (16:9), so sample cards and slides have an image without using any
 * real photograph. Made with Node's zlib, so the seed works without sharp (D-056).
 */
export function samplePng(rgb: [number, number, number], width = 320, height = 180): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 2, 0, 0, 0], 8) // 8-bit, truecolour, no interlace
  const row = Buffer.alloc(1 + width * 3)
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3)
  const pixels = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Brand colours for the sample images (the logo's greens, CLAUDE.md), not hard-coded in pages. */
export const SAMPLE_COLOURS: [number, number, number][] = [
  [0x1d, 0x9d, 0x62],
  [0x1d, 0x72, 0x48],
  [0x0d, 0x41, 0x26],
]

type Item = Record<string, unknown> & { title: string; _status: 'draft' | 'published' }

/**
 * The sample items of each collection, given the ids of the sample file and images. Each has one
 * draft, so reviewers can check that drafts never show on the site.
 */
export function sampleItems(ids: { file: number | string; images: (number | string)[] }): Record<string, Item[]> {
  const image = (n: number) => ids.images[n % ids.images.length]
  const three = <T>(make: (n: number) => T) => [1, 2, 3].map(make)
  const status = (n: number): 'draft' | 'published' => (n === 3 ? 'draft' : 'published')
  const note = (n: number) => (n === 3 ? ' (draft: must never show on the site)' : '')

  return {
    documents: [
      ...DOCUMENT_CATEGORIES.map(({ value, label }, n) => ({
        title: sample(`${label} document`),
        category: value,
        typeLabel: sample('kind of document'),
        reference: sample('reference number'),
        documentStatus: n === 1 ? 'superseded' : 'published',
        publicationDate: day(`2026-0${(n % 9) + 1}-15`),
        description: sample(`description of this ${label} document`),
        file: ids.file,
        fileDescription: sample('file description'),
        ...(value === 'codes' ? { codeFamily: sample('code family') } : {}),
        ...(value === 'consultation'
          ? {
              consultation: {
                commentEmail: 'sample@example.org',
                commentAddress: sample('address for comments'),
                subjectLine: sample('subject line'),
                hearingPlace: sample('hearing place'),
              },
            }
          : {}),
        tags: ['sample'],
        _status: 'published' as const,
      })),
      {
        title: sample('draft document (must never show on the site)'),
        category: 'rules-and-regulations',
        documentStatus: 'published',
        publicationDate: day('2026-10-01'),
        description: sample('description'),
        file: ids.file,
        _status: 'draft',
      },
    ],
    news: three((n) => ({
      title: sample(`news story ${n}${note(n)}`),
      publishedDate: day(`2026-10-${10 + n}`),
      summary: sample('one-line summary of the story'),
      featuredImage: image(n),
      body: richText(sample('first paragraph of the story'), sample('second paragraph of the story')),
      _status: status(n),
    })),
    announcements: three((n) => ({
      title: sample(`announcement ${n}${note(n)}`),
      category: ['public-notice', 'regulatory-notice', 'service-announcement'][n - 1],
      postedDate: day(`2026-10-${10 + n}`),
      summary: sample('one-line summary of the notice'),
      body: richText(sample('text of the notice')),
      _status: status(n),
    })),
    events: three((n) => ({
      title: sample(`event ${n}${note(n)}`),
      startsAt: `2027-01-${10 + n}T09:00:00.000Z`,
      venue: sample('venue'),
      summary: sample('one-line summary of the event'),
      body: richText(sample('description of the event')),
      _status: status(n),
    })),
    tenders: three((n) => ({
      title: sample(`tender ${n}${note(n)}`),
      reference: sample('tender reference'),
      publishedDate: day(`2026-10-${10 + n}`),
      // One already closed, so the closed state can be reviewed too.
      closesAt: n === 1 ? '2026-10-31T12:00:00.000Z' : `2027-02-${10 + n}T12:00:00.000Z`,
      summary: sample('one-line summary of the tender'),
      body: richText(sample('details of the tender')),
      attachments: [ids.file],
      _status: status(n),
    })),
    reports: three((n) => ({
      title: sample(`report ${n}${note(n)}`),
      reportType: ['annual', 'quarterly', 'statistics'][n - 1],
      period: sample('period'),
      publishedDate: day(`2026-0${n + 6}-01`),
      summary: sample('one-line summary of the report'),
      file: ids.file,
      thumbnail: image(n),
      _status: status(n),
    })),
    galleries: three((n) => ({
      title: sample(`gallery ${n}${note(n)}`),
      date: day(`2026-10-${10 + n}`),
      summary: sample('one-line summary of the gallery'),
      photos: ids.images.map((id) => ({ image: id, caption: sample('caption') })),
      _status: status(n),
    })),
    faqs: three((n) => ({
      title: sample(`question ${n}${note(n)}`),
      answer: richText(sample('answer')),
      topic: sample('topic'),
      order: n * 10,
      _status: status(n),
    })),
    pages: three((n) => ({
      title: sample(`information page ${n}${note(n)}`),
      summary: sample('one-line summary of the page'),
      body: richText(sample('first paragraph'), sample('second paragraph')),
      _status: status(n),
    })),
  }
}

/** The content collections the seed fills, in the order it fills them. */
export const SEEDED_COLLECTIONS = ['documents', 'news', 'announcements', 'events', 'tenders', 'reports', 'galleries', 'faqs', 'pages'] as const

/**
 * Why the seed must not run on a database, or null. It refuses any database in which a member of
 * staff has created, changed or uploaded anything (audit log entries with an account, D-083), so
 * it can never mix samples into content people work on. Items written by migrations and by the
 * seed itself have no account in the log.
 */
export function seedRefusal(staffContentEntries: number): string | null {
  if (staffContentEntries === 0) return null
  return `Staff have created or changed content in this database (${staffContentEntries} audit log entr${staffContentEntries === 1 ? 'y' : 'ies'}). The seed only fills review and development databases nobody works in. Nothing was changed.`
}

/** The audit log actions that mean someone worked on content, files or images. */
export const CONTENT_ACTIONS = [
  'content.created',
  'content.draft-saved',
  'content.published',
  'content.unpublished',
  'content.deleted',
  'file.uploaded',
  'file.updated',
  'file.deleted',
  'media.created',
  'media.updated',
  'media.deleted',
  'settings.updated',
] as const
