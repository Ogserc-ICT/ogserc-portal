import config from '@payload-config'
import type { StaticImageData } from 'next/image'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import { cache } from 'react'

import { mediaPath } from '@/lib/media-path'
import { routes } from '@/lib/navigation'
import type { Announcement, Media, News, SiteSetting } from '@/payload-types'

// What public pages read from the CMS (D-096). Every query runs as a visitor (`overrideAccess:
// false` and no user), so only published items ever come back (D-049); never pass a request's
// values into a query here. React's `cache` shares a result between a page and its metadata within
// one request only; nothing is kept between requests (D-051).

export type ImageSource = StaticImageData
export type NoticeCategory = 'Public notice' | 'Regulatory notice' | 'Service announcement' | 'Consultation notice'

/** A news card (homepage Latest updates, the News page). */
export type NewsItem = { id: string; title: string; date: string; excerpt: string; href: string; image?: ImageSource }
/** A notice line (homepage Public notices, the Notices page). */
export type Notice = {
  id: string
  title: string
  /** The date posted on the site; lists sort by it. */
  date: string
  /** The date printed on the notice, if given. */
  issuedDate?: string
  category: NoticeCategory
  href: string
  summary: string
}
export type NewsPhoto = { full: ImageSource; thumb: ImageSource; alt: string }
export type HeroSlide = {
  id: string
  headline: string
  text?: string
  action: { label: string; context?: string; href: string }
  image?: ImageSource
}

const CATEGORY_LABELS: Record<Announcement['category'], NoticeCategory> = {
  'public-notice': 'Public notice',
  'regulatory-notice': 'Regulatory notice',
  'service-announcement': 'Service announcement',
  'consultation-notice': 'Consultation notice',
}

const PUBLIC = { overrideAccess: false } as const

/**
 * Payload, once the page is being made for a visitor. `connection()` keeps Next.js from making the
 * page in advance at build time, when there is no database (Dockerfile); pages are made per visit.
 *
 * Its own instance (`key`), never the default one the admin panel and API use. The production
 * build bundles pages and route handlers separately, each with its own copy of Payload, while
 * getPayload caches on a process-wide global (D-051). If a page started the shared instance first,
 * the API's errors would be this copy's classes, Payload's error formatting in the route copy
 * would not recognise them (`instanceof`), and replies would lose their details, for example the
 * password rules on the admin's create-first-user form (caught by CI, D-096). The migrations have
 * run at boot, so this instance's start applies none.
 */
async function cms() {
  await connection()
  return getPayload({ config, key: 'public-pages' })
}

/** YYYY-MM-DD, as the site's date helpers expect. */
const isoDay = (value: string | null | undefined) => (value ?? '').slice(0, 10)

function asMedia(value: unknown): Media | undefined {
  return value && typeof value === 'object' && 'url' in value ? (value as Media) : undefined
}

/** The image as next/image takes it: the original, or the card-size copy where one was made. */
export function imageOf(value: unknown, size: 'full' | 'card' = 'full'): ImageSource | undefined {
  const media = asMedia(value)
  const src = mediaPath(media?.url)
  if (!media || !src || !media.width || !media.height) return undefined
  const card = media.sizes?.card
  const cardSrc = mediaPath(card?.url)
  if (size === 'card' && cardSrc && card?.width && card.height) return { src: cardSrc, width: card.width, height: card.height }
  return { src, width: media.width, height: media.height }
}

export const altOf = (value: unknown): string => asMedia(value)?.alt ?? ''

export const newsHref = (item: Pick<News, 'slug' | 'link'>) => item.link || `${routes.news.path}/${item.slug}`
export const noticeHref = (item: Pick<Announcement, 'slug' | 'link'>) => item.link || `${routes.notices.path}/${item.slug}`

const toNewsItem = (item: News): NewsItem => ({
  id: String(item.id),
  title: item.title,
  date: isoDay(item.publishedDate),
  excerpt: item.summary,
  href: newsHref(item),
  image: imageOf(item.featuredImage, 'card'),
})

export const categoryLabel = (category: Announcement['category']) => CATEGORY_LABELS[category]

const toNotice = (item: Announcement): Notice => ({
  id: String(item.id),
  title: item.title,
  date: isoDay(item.postedDate),
  issuedDate: item.issuedDate ? isoDay(item.issuedDate) : undefined,
  category: categoryLabel(item.category),
  href: noticeHref(item),
  summary: item.summary,
})

/** Published news, newest first. */
export const listNews = cache(async (limit = 50): Promise<NewsItem[]> => {
  const { docs } = await (await cms()).find({ collection: 'news', ...PUBLIC, sort: ['-publishedDate', '-createdAt'], limit, depth: 1 })
  return docs.map(toNewsItem)
})

/** Published notices, newest first. */
export const listNotices = cache(async (limit = 50): Promise<Notice[]> => {
  const { docs } = await (await cms()).find({ collection: 'announcements', ...PUBLIC, sort: ['-postedDate', '-createdAt'], limit, depth: 0 })
  return docs.map(toNotice)
})

/** A published story with a page of its own (not one that only links elsewhere), or null. */
export const findStory = cache(async (slug: string): Promise<News | null> => {
  const { docs } = await (await cms()).find({
    collection: 'news',
    ...PUBLIC,
    where: { and: [{ slug: { equals: slug } }, { or: [{ link: { exists: false } }, { link: { equals: '' } }] }] },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
})

/** A published notice with a page of its own, or null. */
export const findNotice = cache(async (slug: string): Promise<Announcement | null> => {
  const { docs } = await (await cms()).find({
    collection: 'announcements',
    ...PUBLIC,
    where: { and: [{ slug: { equals: slug } }, { or: [{ link: { exists: false } }, { link: { equals: '' } }] }] },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
})

/** Addresses of the stories and notices that have pages of their own, for the sitemap. */
export const pagedItems = cache(async () => {
  const payload = await cms()
  const ownPage = { or: [{ link: { exists: false } }, { link: { equals: '' } }] }
  const [news, notices] = await Promise.all([
    payload.find({ collection: 'news', ...PUBLIC, where: ownPage, limit: 500, depth: 0, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'announcements', ...PUBLIC, where: ownPage, limit: 500, depth: 0, select: { slug: true, updatedAt: true } }),
  ])
  return {
    news: news.docs.map((doc) => ({ path: `${routes.news.path}/${doc.slug}`, updatedAt: doc.updatedAt })),
    notices: notices.docs.map((doc) => ({ path: `${routes.notices.path}/${doc.slug}`, updatedAt: doc.updatedAt })),
  }
})

/** The site settings (contact details, footer, slides). Public. */
export const siteSettings = cache(async (): Promise<SiteSetting> => (await cms()).findGlobal({ slug: 'site-settings', ...PUBLIC, depth: 1 }))

/** The homepage slides, with their photographs. */
export async function heroSlides(): Promise<HeroSlide[]> {
  const settings = await siteSettings()
  return (settings.heroSlides ?? []).map((slide, n) => ({
    id: slide.id ?? `slide-${n + 1}`,
    headline: slide.headline,
    text: slide.text ?? undefined,
    action: { label: slide.actionLabel, context: slide.actionContext ?? undefined, href: slide.actionLink },
    image: imageOf(slide.image),
  }))
}

/** The phone number as a tel: link (digits and the leading +). */
export const phoneHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`

/** A story's photographs: the featured image first, then the rest, each with a card-size copy. */
export function storyPhotos(story: News): NewsPhoto[] {
  return [story.featuredImage, ...(story.photos ?? [])].flatMap((value) => {
    const full = imageOf(value)
    return full ? [{ full, thumb: imageOf(value, 'card') ?? full, alt: altOf(value) }] : []
  })
}

export type SocialNetwork = 'linkedin' | 'facebook' | 'instagram' | 'x' | 'tiktok' | 'youtube'
export type SocialLink = { network: SocialNetwork; label: string; href: string }

const NETWORK_LABELS: Record<SocialNetwork, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

/** Contact details, office hours, departments, social links and footer text, as the pages show them. */
export async function contactDetails() {
  const settings = await siteSettings()
  const contact = settings.contact
  return {
    introduction: contact?.introduction ?? '',
    addressLines: (contact?.addressLines ?? []).map(({ line }) => line),
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    map: { place: contact?.mapPlace ?? '', linkUrl: contact?.mapLink ?? '', embedUrl: contact?.mapEmbed ?? '' },
    officeHours: (settings.officeHours ?? []).map(({ days, hours }) => ({ days, hours })),
    departments: (settings.departments ?? []).map(({ name, email, description }) => ({ name, email, description: description ?? '' })),
    footerSummary: settings.footerSummary ?? '',
    socialLinks: (settings.socialLinks ?? []).map(
      ({ network, url }): SocialLink => ({ network: network as SocialNetwork, label: NETWORK_LABELS[network as SocialNetwork], href: url }),
    ),
  }
}

export type ContactDetails = Awaited<ReturnType<typeof contactDetails>>
