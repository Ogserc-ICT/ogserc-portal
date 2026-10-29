/**
 * Site structure from SRS Section 4: utility bar, seven-item main menu, footer links.
 *
 * Each link records the page's final URL and whether that page exists yet. Links to pages that are
 * not built yet go to the shared "This section is being prepared" page. When a later build step
 * creates a page, set `ready: true` on its entry (docs/DECISIONS.md D-027).
 */

export const PENDING_PATH = '/being-prepared'

type SiteLink = { label: string; path: string; ready: boolean }

export type ResolvedLink = { label: string; href: string }

export type MenuEntry =
  | { kind: 'link'; id: string; label: string; href: string }
  | { kind: 'group'; id: string; label: string; links: ResolvedLink[] }

const pending = (label: string, path: string): SiteLink => ({ label, path, ready: false })

export const hrefFor = (link: SiteLink): string => (link.ready ? link.path : PENDING_PATH)

const resolve = (link: SiteLink): ResolvedLink => ({ label: link.label, href: hrefFor(link) })

export const routes = {
  about: pending('About Us', '/about'),
  contact: pending('Contact Us', '/contact'),
  licences: pending('Licences', '/licences'),
  faqs: pending('FAQs', '/faqs'),
  search: pending('Search', '/search'),
  consumerComplaint: pending('Consumer Complaint', '/consumer-complaint'),
  userProfile: pending('User Profile', '/user-profile'),
  regulatoryInstruments: pending('Regulatory Instruments', '/regulatory-instruments'),
  energyCaps: pending('Energy Caps', '/regulatory-instruments/energy-caps'),
  news: pending('News', '/media-center/news'),
  tenders: pending('Tenders', '/media-center/tenders'),
  events: pending('Events', '/media-center/events'),
  notices: pending('Public Notices', '/media-center/notices'),
} satisfies Record<string, SiteLink>

const menuGroups: { id: string; label: string; links: SiteLink[] }[] = [
  {
    id: 'about',
    label: 'About OGSERC',
    links: [
      pending('About Us', '/about'),
      pending('Our History', '/about/history'),
      pending('Our Mission', '/about/mission'),
      pending("OGSERC's Structure", '/about/structure'),
    ],
  },
  {
    id: 'regulatory-instruments',
    label: 'Regulatory Instruments',
    links: [
      pending('Rules & Regulations', '/regulatory-instruments/rules-and-regulations'),
      routes.energyCaps,
      pending('Guidelines', '/regulatory-instruments/guidelines'),
      pending('Forms', '/regulatory-instruments/forms'),
      pending('Consultation', '/regulatory-instruments/consultation'),
      pending('Licences', '/regulatory-instruments/licences'),
      pending('Orders & Directives', '/regulatory-instruments/orders-and-directives'),
      pending('Codes', '/regulatory-instruments/codes'),
      pending('Manuals', '/regulatory-instruments/manuals'),
      pending('Market Documents', '/regulatory-instruments/market-documents'),
      pending('Standards', '/regulatory-instruments/standards'),
    ],
  },
  {
    id: 'mandate',
    label: 'Mandate',
    links: [
      pending('Licensing & Registration', '/mandate/licensing-and-registration'),
      pending('Whistleblowing', '/mandate/whistleblowing'),
      pending('Petitions', '/mandate/petitions'),
      pending('Hearings & Dispute Resolution', '/mandate/hearings-and-dispute-resolution'),
    ],
  },
  {
    id: 'media-center',
    label: 'Media Center',
    links: [
      routes.news,
      routes.tenders,
      routes.events,
      pending('Photos & Videos', '/media-center/photos-and-videos'),
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    links: [
      pending('Downloads', '/resources/downloads'),
      pending('Reports & Publications', '/resources/reports-and-publications'),
      pending('Statistics', '/resources/statistics'),
      pending('Tariff & Metering Information', '/resources/tariff-and-metering'),
      pending('Consumer Education', '/resources/consumer-education'),
      pending('Useful Links', '/resources/useful-links'),
    ],
  },
]

const group = (id: string): MenuEntry => {
  const found = menuGroups.find((g) => g.id === id)
  if (!found) throw new Error(`Unknown menu group: ${id}`)
  return { kind: 'group', id, label: found.label, links: found.links.map(resolve) }
}

const single = (id: string, link: SiteLink): MenuEntry => ({
  kind: 'link',
  id,
  label: link.label,
  href: hrefFor(link),
})

/** The seven main-menu items, in SRS Section 4 order. */
export const mainMenu: MenuEntry[] = [
  group('about'),
  group('regulatory-instruments'),
  group('mandate'),
  single('consumer-complaint', routes.consumerComplaint),
  group('media-center'),
  group('resources'),
  single('user-profile', routes.userProfile),
]

export const utilityLinks: ResolvedLink[] = [
  routes.contact,
  routes.licences,
  routes.faqs,
  routes.search,
].map(resolve)

export const footerQuickLinks: ResolvedLink[] = [
  pending('About Us', '/about'),
  pending('Regulatory Framework', '/regulatory-instruments'),
  routes.energyCaps,
  pending('Licences & Permits', '/licences'),
  pending('Consumer Complaints', '/consumer-complaint'),
  pending('News & Updates', '/media-center/news'),
].map(resolve)

/** FR-WEB-06 legal pages. */
export const legalLinks: ResolvedLink[] = [
  pending('Privacy Policy', '/privacy'),
  pending('Terms of Service', '/terms'),
  pending('Cookie Notice', '/cookies'),
  pending('Accessibility Statement', '/accessibility'),
  pending('Sitemap', '/sitemap'),
].map(resolve)
