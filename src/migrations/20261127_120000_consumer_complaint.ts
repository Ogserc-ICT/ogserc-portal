import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { type Block, blocks, complaintsEmail, type Inline, slug, summary, title } from './data/consumer-complaint-2026-11'

// Puts the Consumer Complaint page's first text (FR-CON-01/02) into the Pages collection as a
// draft (D-101): it summarises a draft regulation, so it stays unpublished until OGSERC confirms
// the Regulations are approved, then a publisher publishes it. The email is the "complaints"
// department's from the site settings when this runs. It reads only ./data/, never the app's
// modules, so it keeps working after they change, and it adds the page only if none has its
// address, so it never replaces staff's work.

const BOLD = 1

const textNode = (text: string, format = 0) => ({ type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' })
const element = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  direction: null,
  format: '',
  indent: 0,
  ...extra,
  children,
})
const link = (text: string, url: string) =>
  element('link', [textNode(text)], { version: 3, fields: { url, linkType: 'custom', newTab: false } })

function inlineNode(run: Inline, email: string): unknown {
  if (typeof run === 'string') return textNode(run)
  if ('bold' in run) return textNode(run.bold, BOLD)
  if ('email' in run) return link(email, `mailto:${email}`)
  return link(run.link, run.url)
}

const inlines = (runs: Inline[], email: string) => runs.map((run) => inlineNode(run, email))

function list(items: Inline[][], tag: 'ul' | 'ol', email: string) {
  return element(
    'list',
    items.map((item, n) => element('listitem', inlines(item, email), { value: n + 1 })),
    { listType: tag === 'ul' ? 'bullet' : 'number', tag, start: 1 },
  )
}

function blockNode(block: Block, email: string): unknown {
  if ('h2' in block) return element('heading', [textNode(block.h2)], { tag: 'h2' })
  if ('h3' in block) return element('heading', [textNode(block.h3)], { tag: 'h3' })
  if ('p' in block) return element('paragraph', inlines(block.p, email), { textFormat: 0 })
  if ('ul' in block) return list(block.ul, 'ul', email)
  return list(block.ol, 'ol', email)
}

type Settings = { departments?: { name?: string | null; email?: string | null }[] | null }

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const { totalDocs } = await payload.count({ collection: 'pages', where: { slug: { equals: slug } }, req })
  if (totalDocs > 0) return
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, req })) as Settings
  const email = settings.departments?.find((department) => /complaint/i.test(department.name ?? ''))?.email || complaintsEmail
  await payload.create({
    collection: 'pages',
    req,
    draft: true,
    data: {
      title,
      slug,
      summary,
      body: { root: element('root', blocks.map((block) => blockNode(block, email))) } as never,
      _status: 'draft',
    },
  })
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'pages', where: { slug: { equals: slug } }, req })
}
