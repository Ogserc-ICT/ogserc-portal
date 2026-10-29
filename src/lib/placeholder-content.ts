/**
 * TEMPORARY EXCEPTION to the rule that content is edited in the CMS and never hard-coded
 * (CLAUDE.md Conventions; docs/DECISIONS.md D-028).
 *
 * Build step 2 needs sample content so OGSERC can review the homepage design before any
 * collections exist. Every string here is a clearly marked placeholder. Nothing here is real
 * regulatory content. Build step 4 replaces this file with Payload CMS queries and the seed
 * script (FR-CMS-08). It must not exist at launch (docs/RUNBOOK.md launch checklist).
 *
 * Exception within the exception: `contactDetails`, `footer` and `socialLinks` hold real details
 * supplied by OGSERC (2026-10-29, D-057). The step 4 seed must carry them into the CMS.
 */

import { PENDING_PATH, hrefFor, routes } from '@/lib/navigation'

/** Categories from SRS FR-NEWS-03. */
export type NoticeCategory =
  'Public notice' | 'Regulatory notice' | 'Service announcement' | 'Consultation notice'

export type NewsItem = { id: string; title: string; date: string; excerpt: string; href: string }
export type Notice = {
  id: string
  title: string
  date: string
  category: NoticeCategory
  href: string
}
export type Tender = {
  id: string
  title: string
  reference: string
  closingDate: string
  href: string
}
export type EventItem = { id: string; name: string; date: string; venue: string; href: string }

export const hero = {
  tagline: '[Sample tagline, OGSERC to supply]',
  introduction: '[Sample introduction to the Commission, OGSERC to supply]',
  // Proposed wording for the one primary action. OGSERC to confirm.
  actionLabel: 'How to make a complaint',
}

export type HeroSlide = {
  id: string
  headline: string
  text?: string
  action: { label: string; href: string }
}

/**
 * Hero carousel slides, in the order of the photographs in src/assets/hero/. Slide 1 carries the
 * tagline and introduction. The action wording on slides 2 and 3 is proposed; OGSERC to confirm.
 */
export const heroSlides: HeroSlide[] = [
  {
    id: 'welcome',
    headline: hero.tagline,
    text: hero.introduction,
    action: { label: hero.actionLabel, href: hrefFor(routes.consumerComplaint) },
  },
  {
    id: 'slide-2',
    headline: '[Sample headline for slide 2, OGSERC to supply]',
    action: { label: 'View energy caps', href: hrefFor(routes.energyCaps) },
  },
  {
    id: 'slide-3',
    headline: '[Sample headline for slide 3, OGSERC to supply]',
    action: { label: 'Browse regulatory instruments', href: hrefFor(routes.regulatoryInstruments) },
  },
]

export const news: NewsItem[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `news-${n}`,
  title: `[Sample news headline ${n}, OGSERC to supply]`,
  date: `2026-09-${String(30 - n * 3).padStart(2, '0')}`,
  excerpt: '[Sample summary of the news story, OGSERC to supply]',
  href: PENDING_PATH,
}))

const noticeCategories: NoticeCategory[] = [
  'Public notice',
  'Regulatory notice',
  'Service announcement',
  'Consultation notice',
  'Public notice',
]

export const notices: Notice[] = noticeCategories.map((category, i) => ({
  id: `notice-${i + 1}`,
  title: `[Sample ${category.toLowerCase()} title, OGSERC to supply]`,
  date: `2026-09-${String(28 - i * 5).padStart(2, '0')}`,
  category,
  href: PENDING_PATH,
}))

export const tenders: Tender[] = [1, 2, 3].map((n) => ({
  id: `tender-${n}`,
  title: `[Sample tender title ${n}, OGSERC to supply]`,
  reference: '[Sample reference, OGSERC to supply]',
  closingDate: `2026-11-${String(n * 7).padStart(2, '0')}`,
  href: PENDING_PATH,
}))

export const events: EventItem[] = [1, 2, 3].map((n) => ({
  id: `event-${n}`,
  name: `[Sample event name ${n}, OGSERC to supply]`,
  date: `2026-11-${String(n * 6 + 2).padStart(2, '0')}`,
  venue: '[Sample venue, OGSERC to supply]',
  href: PENDING_PATH,
}))

export const contactDetails = {
  addressLines: [
    'Floors 5 & 6, OPIC Towers',
    'Central Business District, Oke-Ilewo',
    'Abeokuta, Ogun State',
  ],
  phone: '+234 813 772 0058',
  email: 'info@ogserc.org.ng',
  mapNote: '[Map of the office location, to be added]',
}

/** The phone number as a tel: link (digits and the leading +, no spaces). */
export const phoneHref = `tel:${contactDetails.phone.replace(/[^+\d]/g, '')}`

export const footer = {
  summary: "Driving excellence in Ogun State's power sector through transparent oversight and robust regulation.",
}

export type SocialLink = {
  network: 'linkedin' | 'facebook' | 'instagram' | 'x' | 'tiktok'
  label: string
  href: string
}

export const socialLinks: SocialLink[] = [
  { network: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/146906161/' },
  { network: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/share/1CD7MkwJJj/' },
  { network: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/official_ogserc/' },
  { network: 'x', label: 'X', href: 'https://x.com/Ogserc_Official' },
  { network: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@ogserc01' },
]
