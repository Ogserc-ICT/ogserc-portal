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

import type { StaticImageData } from 'next/image'

import consultationCard from '@/assets/updates/consultation-cp-2026-001.jpg'
import type { IconName } from '@/components/ui/Icon'
import { PENDING_PATH, hrefFor, routes } from '@/lib/navigation'
import { articleHref, newsArticles } from '@/lib/news/news-articles'
import { noticeHref, publicNotices } from '@/lib/notices/public-notices'

const [registrationNotice] = publicNotices

/** Categories from SRS FR-NEWS-03. */
export type NoticeCategory =
  'Public notice' | 'Regulatory notice' | 'Service announcement' | 'Consultation notice'

export type NewsItem = {
  id: string
  title: string
  date: string
  excerpt: string
  href: string
  /** A photograph for the card; items without one show the branded placeholder. */
  image?: StaticImageData
}
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

/**
 * Homepage "Latest updates": real items only (owner, 2026-10-30), newest first. Build step 9
 * moves these into the News collection.
 */
export const latestUpdates: NewsItem[] = [
  ...newsArticles.map((article) => ({
    id: article.slug,
    title: article.title,
    date: article.date,
    excerpt: article.excerpt,
    href: articleHref(article),
    image: article.photos[0]?.thumb,
  })),
  {
    id: 'ogserc-cp-2026-001',
    title: 'Have your say: proposed Order on the Ogun State Grid and the Ogun Electricity Market',
    date: '2026-11-16',
    excerpt:
      'Consultation paper OGSERC/CP/2026/001 and the draft Order are open for comment until 30 November 2026. Read them and send your comments to info@ogserc.org.ng.',
    href: '/regulatory-instruments/consultation/ogserc-cp-2026-001',
    // Made from hero photo 2 and the two documents' cover pages (D-071).
    image: consultationCard,
  },
  {
    id: 'ogserc-ord-2026-002',
    title: 'OGSERC (Transitional Adoption of NERC Regulatory Instruments) Order, 2026',
    date: '2026-11-02',
    excerpt:
      'Order OGSERC/ORD/2026/002 takes effect on 3 November 2026. Read the Order and download the signed copy.',
    href: '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-002',
  },
  {
    id: 'registration-notice',
    title: 'Public notice: commencement of operations and mandatory registration',
    date: registrationNotice.postedDate,
    excerpt:
      'Who must register, the deadlines (existing operators by 1 January 2027), fees, how to register and the bank accounts for payment.',
    href: noticeHref(registrationNotice),
  },
  {
    id: 'registration-forms',
    title: 'Registration forms REG-01A to REG-01K are available to download',
    date: '2026-10-30',
    excerpt:
      'Use the Registration Form Selection Guide to find your form, then download it and submit it at the Registry or by email.',
    href: hrefFor(routes.forms),
  },
  {
    id: 'ogserc-ord-2026-001',
    title:
      'OGSERC Order on Commencement of Operations and Registration of Licensees and Electricity Operators, 2026',
    date: '2026-10-26',
    excerpt:
      'Order OGSERC/ORD/2026/001 takes effect on 2 November 2026. Read the Order and download the signed copy.',
    href: '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001',
  },
]

/**
 * Homepage public notices: real notices only (owner, 2026-10-30), newest first. Notices on the
 * same date keep this order, so the latest goes first.
 */
export const notices: Notice[] = [
  {
    id: 'ogserc-cp-2026-001-consultation',
    title:
      'Consultation on the proposed Order on the Ogun State Grid and the Ogun Electricity Market: comments by 30 November 2026',
    date: '2026-11-16',
    category: 'Consultation notice',
    href: '/regulatory-instruments/consultation/ogserc-cp-2026-001',
  },
  {
    // Dated with the Order (D-070), as the list shows each item's own date.
    id: 'ogserc-ord-2026-002-published',
    title: 'Order OGSERC/ORD/2026/002 on the transitional adoption of NERC regulatory instruments',
    date: '2026-11-02',
    category: 'Regulatory notice',
    href: '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-002',
  },
  {
    id: registrationNotice.slug,
    title: registrationNotice.title,
    date: registrationNotice.postedDate,
    category: registrationNotice.category,
    href: noticeHref(registrationNotice),
  },
  {
    id: 'registration-forms-available',
    title:
      'Registration forms for licensees and electricity operators are now available to download',
    date: '2026-10-30',
    category: 'Public notice',
    href: hrefFor(routes.forms),
  },
  {
    id: 'ogserc-ord-2026-001-published',
    title:
      'Order OGSERC/ORD/2026/001 on commencement of operations and registration is now published',
    date: '2026-10-30',
    category: 'Regulatory notice',
    href: '/regulatory-instruments/orders-and-directives/ogserc-ord-2026-001',
  },
]

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
  // Hidden until OGSERC names one (owner, 2026-11-02, D-066); set a name to show it again.
  contactPerson: null as string | null,
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

/**
 * About Us, as supplied by OGSERC on 2026-11-01 (D-064). The short titles on the "What we do"
 * items are ours, drawn from each item, for scanning; OGSERC can change them.
 */
export const aboutUs = {
  introduction: [
    'The Ogun State Electricity Regulatory Commission (OGSERC) regulates the electricity market in Ogun State, independently of the operators it oversees. It was set up under the Ogun State Power Law, 2024. That law followed the Electricity Act, 2023, which gave Nigerian states the power to create and regulate their own electricity markets.',
    'OGSERC oversees the generation, transmission, distribution and supply of electricity within the state. Our job has two sides. Homes, businesses and industries in Ogun State should get power that is reliable, safe and fairly priced. Investors should have a stable, open environment to build in.',
  ],
  whatWeDo: [
    {
      title: 'Licensing',
      icon: 'licence',
      text: 'We issue and manage licences for electricity businesses operating in the state. These include distribution companies, generators, and embedded and off-grid operators.',
    },
    {
      title: 'Tariffs',
      icon: 'scales',
      text: 'We set and review tariffs. Prices should reflect efficient costs and protect consumers, while still letting licensees recover legitimate investment.',
    },
    {
      title: 'The Ogun State Electricity Market',
      icon: 'bolt',
      text: 'We are building the Ogun State Electricity Market (OGEM). This includes frameworks for third-party investment in distribution networks and for dedicated supply to industrial clusters.',
    },
    {
      title: 'Performance',
      icon: 'eye',
      text: 'We track how licensees perform on supply hours, metering, billing and service quality, and we hold them to account.',
    },
    {
      title: 'Consumer protection',
      icon: 'megaphone',
      text: 'We receive and resolve customer complaints, enforce service standards, and make sure consumers know their rights.',
    },
    {
      title: 'Regulations, codes and standards',
      icon: 'document',
      text: 'We make the regulations, codes and standards that govern safety, technical operations and commercial conduct in the market.',
    },
  ],
} satisfies {
  introduction: string[]
  whatWeDo: { title: string; icon: IconName; text: string }[]
}

/**
 * Our History, as supplied by OGSERC on 2026-11-01 (D-064). The key dates repeat the dates in
 * the text, nothing more.
 */
export const ourHistory = {
  paragraphs: [
    'OGSERC exists because of the Electricity Act, 2023. Until then, the federal government alone regulated electricity in Nigeria. The Act, which President Bola Tinubu signed, was the first decentralization of the power sector since the 2005 Electric Power Sector Reform Act, and it allowed states to set up and regulate their own electricity markets.',
    'The Ogun State House of Assembly took the bill, H.B.No.017/OG/2024 – Ogun State Power Sector Law, through second reading in August 2024 and held a stakeholders’ forum on it on 5 September 2024. The Assembly passed it on 12 September 2024, and Governor Dapo Abiodun signed it into law on 30 September 2024. The bill provided for an electricity market in the state and the main bodies to run it. It became the Ogun State Power Law, 2024, which established the Commission.',
    "The federal regulator handed over at the end of the year. Ogun State met the law's conditions, notified NERC, and asked it to transfer oversight of the intrastate market. NERC approved this with effect from 24 December 2024, and announced the order on 30 December 2024. The order told Eko Electricity Distribution Company, Ikeja Electric and Ibadan Electricity Distribution Company to form subsidiaries to take over intrastate supply and distribution in Ogun State. Those subsidiaries must get their licences from the state regulator, and every transfer under the order was due by 23 June 2025. NERC remains the regulator for interstate and international generation, transmission, supply, trading and system operations.",
  ],
  keyDates: [
    {
      date: '2023',
      text: 'The Electricity Act, 2023 allows states to regulate their own electricity markets.',
    },
    {
      date: 'August 2024',
      text: 'The Ogun State House of Assembly takes the bill through second reading.',
    },
    { date: '5 September 2024', text: 'The Assembly holds a stakeholders’ forum on the bill.' },
    { date: '12 September 2024', text: 'The Assembly passes the bill.' },
    {
      date: '30 September 2024',
      text: 'Governor Dapo Abiodun signs the Ogun State Power Law, 2024.',
    },
    {
      date: '24 December 2024',
      text: 'NERC’s transfer of oversight of the intrastate market takes effect.',
    },
    { date: '30 December 2024', text: 'NERC announces the order.' },
    { date: '23 June 2025', text: 'Every transfer under the order is due.' },
  ],
}

/**
 * OGSERC's Structure, as supplied by OGSERC on 2026-11-01 with its organogram (D-064). The units
 * under each division are copied from the organogram. The Office of the Chairman's units are the
 * three the organogram draws beside the Chairman / CEO.
 */
export const ogsercStructure = {
  introduction: [
    'The Law provided for a tenured appointment of five (5) Commissioners with one designated as the Executive Chairman. The Commissioners are nominated by the Governor and confirmed by the State House of Assembly.',
    'The Commission is made up of five (5) divisions each with a strategic role of maintaining the efficient operations of the Commission.',
  ],
  officeOfTheChairman: {
    name: 'Office of the Chairman',
    units: ['Internal Audit', 'Public Affairs and Stakeholder', 'Registry'],
  },
  divisions: [
    {
      name: 'Legal, Licensing and Consumer Affairs',
      units: ['Licensing', 'Compliance / Legal Services', 'Consumer Affairs'],
    },
    {
      name: 'Engineering Services',
      units: [
        'Engineering Standard',
        'Networks',
        'Performance Monitoring',
        'Occupational Health, Safety and Performance Analysis',
      ],
    },
    {
      name: 'Financial Management Services',
      units: ['Finance and Account', 'HR and Admin', 'ICT', 'Procurement'],
    },
    {
      name: 'Electricity Market, Planning and Research',
      units: ['Market Analysis', 'Tariff and Rates', 'Policy Planning and Innovation', 'Research'],
    },
  ],
}
