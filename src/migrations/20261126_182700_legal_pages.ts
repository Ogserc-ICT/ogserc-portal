import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

import { contactEmail, privacyPolicy, termsOfService } from './data/legal-2026-11'

// Puts the Privacy Policy and Terms of Service, which sat in src/lib/legal/legal-pages.ts, into the
// Pages collection, published (D-100), word for word: each numbered section becomes a heading, its
// paragraphs and list follow, and the "Contact Us" line links the contact email from the site
// settings. It reads only ./data/legal-2026-11.ts, never the app's modules, so it keeps working after
// they change. It adds a page only if no page has its web address, so it never replaces staff's work.

type Section = (typeof privacyPolicy)['sections'][number]

const textNode = (text: string) => ({ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' })
const element = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  direction: null,
  format: '',
  indent: 0,
  ...extra,
  children,
})
const paragraph = (children: unknown[]) => element('paragraph', children, { textFormat: 0 })
const mailLink = (email: string) =>
  element('link', [textNode(email)], { version: 3, fields: { url: `mailto:${email}`, linkType: 'custom', newTab: false } })

function sectionNodes(section: Section, email: string): unknown[] {
  const nodes: unknown[] = [element('heading', [textNode(section.heading)], { tag: 'h2' })]
  for (const text of section.paragraphs) nodes.push(paragraph([textNode(text)]))
  if (section.list) {
    nodes.push(
      element(
        'list',
        section.list.map((item, n) => element('listitem', [textNode(item)], { value: n + 1 })),
        { listType: 'bullet', tag: 'ul', start: 1 },
      ),
    )
  }
  if (section.emailLead) nodes.push(paragraph([textNode(`${section.emailLead} `), mailLink(email), textNode('.')]))
  return nodes
}

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, req })) as { contact?: { email?: string | null } }
  const email = settings.contact?.email || contactEmail
  for (const page of [privacyPolicy, termsOfService]) {
    const { totalDocs } = await payload.count({ collection: 'pages', where: { slug: { equals: page.slug } }, req })
    if (totalDocs > 0) continue
    await payload.create({
      collection: 'pages',
      req,
      data: {
        title: page.title,
        slug: page.slug,
        summary: page.description,
        lastUpdated: page.lastUpdated,
        body: { root: element('root', page.sections.flatMap((section) => sectionNodes(section, email))) } as never,
        _status: 'published',
      },
    })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({ collection: 'pages', where: { slug: { in: [privacyPolicy.slug, termsOfService.slug] } }, req })
}
