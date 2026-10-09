/**
 * TEMPORARY EXCEPTION to the rule that content is edited in the CMS and never hard-coded
 * (CLAUDE.md Conventions; docs/DECISIONS.md D-028).
 *
 * Build step 2 needs sample content so OGSERC can review the homepage design before any
 * collections exist. Every string here is a clearly marked placeholder. Nothing here is real
 * regulatory content. Build step 4 replaces this file with Payload CMS queries and the seed
 * script (FR-CMS-08). It must not exist at launch (docs/RUNBOOK.md launch checklist).
 */

import { PENDING_PATH } from '@/lib/navigation'

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
  addressLines: ['[Sample office address, OGSERC to supply]', 'Ogun State, Nigeria'],
  phone: '[Sample phone number, OGSERC to supply]',
  email: '[Sample email address, OGSERC to supply]',
  mapNote: '[Map of the office location, added once OGSERC confirms the address]',
}

export const footer = {
  summary: "[Sample summary of the Commission's role, OGSERC to supply]",
  social: '[Social media accounts, OGSERC to supply]',
}
