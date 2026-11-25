import path from 'node:path'

import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import { SNAPSHOT } from './data/content-2026-11'

// Puts the real content that sat in code before Step 4 slice 5b into the CMS (D-096): the NERC news
// story and its photographs, the items in the homepage's Latest updates and Public notices lists,
// the registration notice, and the site settings (contact details, office hours, departments, social
// links, footer text, homepage slides). Runs in every database like the other migrations, so the live
// site, CI and every developer see the same content. It reads only ./data/content-2026-11.ts and
// src/assets/ (copied into the production image), never the app's own modules, so it keeps working
// after those change.
//
// Safe to run on a database staff already use: it adds an item only if no item has its web address,
// adds an image only if none has its file name, and fills the site settings only if no contact email
// is set yet. It never changes or removes anything staff made.

const ASSETS = path.resolve(process.cwd(), 'src/assets')

type Id = number | string
type Api = {
  find(args: Record<string, unknown>): Promise<{ docs: Record<string, unknown>[] }>
  create(args: Record<string, unknown>): Promise<{ id: Id }>
  delete(args: Record<string, unknown>): Promise<unknown>
  findGlobal(args: Record<string, unknown>): Promise<Record<string, unknown>>
  updateGlobal(args: Record<string, unknown>): Promise<unknown>
}

const day = (iso: string) => `${iso}T00:00:00.000Z`

// --- Rich text (Payload's Lexical format) --------------------------------------------------------

type Inline = string | { link: string; text: string }

const textNode = (text: string, format = 0) => ({ type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' })
const inline = (part: Inline) =>
  typeof part === 'string'
    ? textNode(part)
    : { type: 'link', version: 3, fields: { url: part.link, linkType: 'custom', newTab: false }, direction: null, format: '', indent: 0, children: [textNode(part.text)] }
const element = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  direction: null,
  format: '',
  indent: 0,
  ...extra,
  children,
})
const paragraph = (...parts: Inline[]) => element('paragraph', parts.map(inline), { textFormat: 0 })
const heading = (text: string) => element('heading', [textNode(text)], { tag: 'h2' })
const list = (items: Inline[][]) =>
  element(
    'list',
    items.map((parts, n) => element('listitem', parts.map(inline), { value: n + 1 })),
    { listType: 'bullet', tag: 'ul', start: 1 },
  )
const block = (fields: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields })
const root = (children: unknown[]) => ({ root: element('root', children) })

const longDate = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// --- What goes in --------------------------------------------------------------------------------

type Photo = { file: string; alt: string }

const [story] = SNAPSHOT.newsArticles
const [notice] = SNAPSHOT.publicNotices
const NOTICE_PATH = `/media-center/notices/${notice.slug}`
const ORDER_001_PATH = '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001'
const FORMS_PATH = '/regulatory-instruments/forms'

const HERO_PHOTOS: Photo[] = SNAPSHOT.heroSlides.map((_, n) => ({
  file: `hero/hero-${n + 1}.jpg`,
  alt: `Homepage slide photograph ${n + 1}`,
}))
const STORY_PHOTOS: Photo[] = story.photos.map(({ full, alt }) => ({ file: full, alt }))
const CONSULTATION_CARD: Photo = {
  file: 'updates/consultation-cp-2026-001.jpg',
  alt: 'Cover pages of consultation paper OGSERC/CP/2026/001 and the draft Order',
}

/**
 * The S3 storage plugin keeps the first file of a request in `req.context` and reuses it for every
 * later upload in the same request, so without this every photo after the first was stored as a
 * copy of the first in the bucket (2026-11-25, D-097). Without S3 (CI, development) it did not show.
 */
function forgetPreviousUpload(req: PayloadRequest) {
  if (req.context) delete (req.context as Record<string, unknown>)._payloadCloudStorage
  req.file = undefined
  req.payloadUploadSizes = undefined
}

async function image(api: Api, req: PayloadRequest, photo: Photo): Promise<Id> {
  // Reused only if it is this migration's own upload (same file name and description), never a
  // staff upload that happens to share the file name. A new upload of a taken name gets a new one.
  const filename = path.basename(photo.file)
  const { docs } = await api.find({
    collection: 'media',
    where: { and: [{ filename: { equals: filename } }, { alt: { equals: photo.alt } }] },
    limit: 1,
    depth: 0,
    req,
  })
  if (docs[0]) return docs[0].id as Id
  forgetPreviousUpload(req)
  return (await api.create({ collection: 'media', data: { alt: photo.alt }, filePath: path.join(ASSETS, photo.file), req })).id
}

async function addOnce(api: Api, req: PayloadRequest, collection: string, data: Record<string, unknown>) {
  const { docs } = await api.find({ collection, where: { slug: { equals: data.slug } }, limit: 1, depth: 0, draft: true, req })
  if (docs[0]) return
  await api.create({ collection, data: { ...data, _status: 'published' }, req })
}

function storyBody() {
  return root(
    story.body.map((part) =>
      part.kind === 'paragraph'
        ? paragraph(part.text)
        : block({ blockType: 'highlights', blockName: '', intro: part.intro, items: part.items.map(({ term, text }) => ({ term, text })) }),
    ),
  )
}

function noticeBody() {
  const sections = notice.sections.flatMap((section) => [
    heading(section.heading),
    ...('intro' in section && section.intro ? [paragraph(section.intro)] : []),
    ...('items' in section && section.items ? [list(section.items.map((item) => [item]))] : []),
    ...('outro' in section && section.outro ? [paragraph(section.outro)] : []),
  ])
  const { howToRegister } = notice
  const email = { link: `mailto:${howToRegister.email}`, text: howToRegister.email }
  return root([
    ...sections,
    heading('How to register'),
    paragraph(howToRegister.intro),
    list([[`By hand: ${howToRegister.byHand}`], ['By email: ', email]]),
    paragraph({ link: FORMS_PATH, text: 'Find and download your registration form' }),
    paragraph(`Issued at ${notice.issuedAt}, ${longDate.format(new Date(day(notice.issuedDate)))}.`),
    paragraph(`${notice.enquiries} `, email),
  ])
}

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const api = payload as unknown as Api

  // One at a time: they share the migration's transaction, so a failure must stop at the first.
  const heroIds: Id[] = []
  for (const photo of HERO_PHOTOS) heroIds.push(await image(api, req, photo))
  const storyIds: Id[] = []
  for (const photo of STORY_PHOTOS) storyIds.push(await image(api, req, photo))
  const consultationCard = await image(api, req, CONSULTATION_CARD)

  // Latest updates: the story, and items that point at another page.
  // Created oldest first, and within one date last-listed first, so lists sorted newest first
  // (ties broken by creation, newest first) keep the order the site showed.
  for (const update of [...SNAPSHOT.latestUpdates].reverse()) {
    if (update.id === story.slug) {
      const [lead, ...gallery] = storyIds
      await addOnce(api, req, 'news', {
        title: story.title,
        slug: story.slug,
        publishedDate: day(story.date),
        summary: story.excerpt,
        featuredImage: lead,
        photos: gallery,
        body: storyBody(),
      })
      continue
    }
    await addOnce(api, req, 'news', {
      title: update.title,
      slug: update.id,
      publishedDate: day(update.date),
      summary: update.excerpt,
      link: update.href,
      ...('image' in update && update.image ? { featuredImage: consultationCard } : {}),
    })
  }

  // Public notices: the registration notice in full, and items that point at another page.
  const categories: Record<string, string> = {
    'Public notice': 'public-notice',
    'Regulatory notice': 'regulatory-notice',
    'Service announcement': 'service-announcement',
    'Consultation notice': 'consultation-notice',
  }
  for (const item of [...SNAPSHOT.notices].reverse()) {
    if (item.id === notice.slug) {
      await addOnce(api, req, 'announcements', {
        title: notice.title,
        slug: notice.slug,
        category: categories[notice.category],
        postedDate: day(notice.postedDate),
        issuedDate: day(notice.issuedDate),
        issuedAt: notice.issuedAt,
        summary: notice.summary,
        body: noticeBody(),
        payment: { intro: notice.payment.intro, accounts: notice.payment.accounts.map((account) => ({ ...account })) },
        enquiries: { note: notice.enquiries, email: notice.howToRegister.email },
        signOff: { closing: notice.closing, signatories: notice.signatories },
        issuedUnder: { label: 'Order No.', reference: 'OGSERC/ORD/2026/001', link: ORDER_001_PATH },
        relatedLinks: [
          { label: 'Read the Order', link: ORDER_001_PATH },
          { label: 'Registration forms', link: FORMS_PATH },
        ],
      })
      continue
    }
    await addOnce(api, req, 'announcements', {
      title: item.title,
      slug: item.id,
      category: categories[item.category],
      postedDate: day(item.date),
      summary: item.title,
      link: item.href,
    })
  }

  // Site settings, only if nobody has filled them in yet.
  const settings = await api.findGlobal({ slug: 'site-settings', depth: 0, req })
  if (!(settings.contact as { email?: unknown } | undefined)?.email) {
    const { contactDetails, contactPage, footer, socialLinks, heroSlides } = SNAPSHOT
    await api.updateGlobal({
      slug: 'site-settings',
      req,
      data: {
        contact: {
          introduction: contactPage.introduction,
          addressLines: contactDetails.addressLines.map((line) => ({ line })),
          phone: contactDetails.phone,
          email: contactDetails.email,
          mapPlace: contactDetails.map.place,
          mapLink: contactDetails.map.linkUrl,
          mapEmbed: contactDetails.map.embedUrl,
        },
        officeHours: contactPage.officeHours.map(({ days, hours }) => ({ days, hours })),
        departments: contactPage.departments.map(({ name, email, description }) => ({ name, email, description })),
        footerSummary: footer.summary,
        socialLinks: socialLinks.map(({ network, href }) => ({ network, url: href })),
        heroSlides: heroSlides.map((slide, n) => ({
          image: heroIds[n],
          headline: slide.headline,
          text: 'text' in slide ? slide.text : undefined,
          actionLabel: slide.action.label,
          actionContext: 'context' in slide.action ? slide.action.context : undefined,
          actionLink: slide.action.href,
        })),
      },
    })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  const api = payload as unknown as Payload & Api
  const newsSlugs = SNAPSHOT.latestUpdates.map((update) => update.id)
  const noticeSlugs = SNAPSHOT.notices.map((item) => item.id)
  await api.delete({ collection: 'news', where: { slug: { in: newsSlugs } }, req })
  await api.delete({ collection: 'announcements', where: { slug: { in: noticeSlugs } }, req })
  for (const photo of [...HERO_PHOTOS, ...STORY_PHOTOS, CONSULTATION_CARD]) {
    await api.delete({ collection: 'media', where: { and: [{ filename: { equals: path.basename(photo.file) } }, { alt: { equals: photo.alt } }] }, req })
  }
  // The site settings are left as they are: staff may have changed them since.
}
