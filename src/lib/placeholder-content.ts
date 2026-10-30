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

// The tagline is OGSERC's; the introduction follows OGSERC's own footer summary (D-057).
export const hero = {
  tagline: 'Electricity for all in Ogun State',
  introduction: "Transparent oversight and robust regulation of Ogun State's power sector.",
}

export type HeroSlide = {
  id: string
  headline: string
  text?: string
  /** `context` is read by screen readers only, after the label (WCAG 2.4.4 link purpose). */
  action: { label: string; context?: string; href: string }
}

/**
 * Hero carousel slides, in the order of the photographs in src/assets/hero/. Slide 1 carries the
 * tagline and introduction. The headlines on slides 2 and 3 were drafted for the owner (D-057).
 */
export const heroSlides: HeroSlide[] = [
  {
    id: 'welcome',
    headline: hero.tagline,
    text: hero.introduction,
    action: { label: 'Learn more', context: 'about OGSERC', href: hrefFor(routes.about) },
  },
  {
    id: 'slide-2',
    headline: 'Know the energy caps for your area',
    action: { label: 'View energy caps', href: hrefFor(routes.energyCaps) },
  },
  {
    id: 'slide-3',
    headline: 'Regulations, orders and codes in one place',
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
  // OGSERC's Google Maps link (OPIC Tower, 7.1344754, 3.3396073) and its embed address (D-058).
  map: {
    place: 'OGSERC head office, OPIC Towers, Abeokuta',
    linkUrl: 'https://maps.app.goo.gl/CxErwNu1aMirsPyS6',
    embedUrl:
      'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1000!2d3.3396073!3d7.1344754!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103a4b87fcddfee9%3A0x5d02fa78ed7c2221!2sOpic%20Tower!5e0!3m2!1sen!2sng!4v1',
  },
}

/** The phone number as a tel: link (digits and the leading +, no spaces). */
export const phoneHref = `tel:${contactDetails.phone.replace(/[^+\d]/g, '')}`

export const footer = {
  summary:
    "Driving excellence in Ogun State's power sector through transparent oversight and robust regulation.",
}

export type SocialLink = {
  network: 'linkedin' | 'facebook' | 'instagram' | 'x' | 'tiktok'
  label: string
  href: string
}

export const socialLinks: SocialLink[] = [
  {
    network: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/ogserc-ogsg-ab701b447/',
  },
  {
    network: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/p/The-Ogun-State-Electricity-Regulatory-Commission-Ogserc-61596175582845/',
  },
  { network: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/official_ogserc/' },
  { network: 'x', label: 'X', href: 'https://x.com/Ogserc_Official' },
  { network: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@ogserc01' },
]

/** Contact page (FR-CNT-01). Emails and hours from OGSERC; descriptions drafted (D-059). */
export const contactPage = {
  introduction:
    'Get in touch with the Commission with a question, a complaint or feedback. We are here to help consumers, electricity companies, investors and the public.',
  departments: [
    {
      name: 'Consumer complaints',
      email: 'ccu@ogserc.org.ng',
      description:
        'Billing disputes, disconnections, metering and other complaints about your electricity service.',
    },
    {
      name: 'Licensing and registration',
      email: 'registration@ogserc.org.ng',
      description: 'Licence applications and registration with the Commission.',
    },
    {
      name: 'General enquiries',
      email: contactDetails.email,
      description: 'Questions about the Commission, licensing and regulation.',
    },
  ],
  officeHours: [
    { days: 'Monday to Friday', hours: '8:00am to 5:00pm' },
    { days: 'Saturday, Sunday and public holidays', hours: 'Closed' },
  ],
}

/**
 * Forms page "How to submit" (D-063). The two ways to submit are the only ones: there is no online
 * portal. Address in the selection guide's own wording; hours reused from the contact page (owner,
 * 2026-10-30). Unknown details stay labelled placeholders.
 */
export const formsSubmission = {
  registry: '5th and 6th Floors, OPIC Building, Oke-Ilewo, Abeokuta',
  email: 'registration@ogserc.org.ng',
  officeHours: contactPage.officeHours,
  contactPerson: '[OGSERC to supply]',
}

/** Contact form enquiry types, agreed with the owner (D-059). */
export const enquiryTypes = [
  'General enquiry',
  'Consumer complaint',
  'Licensing',
  'Tariffs and energy caps',
  'Media',
  'Other',
]

/** Vision, mission and values (PRIDE), as supplied by OGSERC on 2026-10-29 (D-061). */
export const visionMissionValues = {
  vision:
    'A reliable, investable and fair electricity market that powers Ogun State’s homes and industries around the clock.',
  mission:
    'To regulate the Ogun State Electricity Market transparently and predictably, licensing capable operators, setting cost-reflective tariffs, enforcing service standards and protecting consumers.',
  values: [
    { name: 'Predictability', text: 'Rules published in advance, decisions consistent with them.' },
    { name: 'Responsiveness', text: 'Consumers and investors get answers within set timelines.' },
    { name: 'Integrity', text: 'Independent, conflict-free decision-making.' },
    { name: 'Data', text: 'Decisions grounded in measured performance, not assertion.' },
    { name: 'Excellence', text: 'A professional workforce held to clear standards.' },
  ],
}
