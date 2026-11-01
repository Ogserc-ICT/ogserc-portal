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
  about: { label: 'About Us', path: '/about', ready: true },
  history: { label: 'Our History', path: '/about/history', ready: true },
  // SRS Section 4's "Our Mission", renamed with the owner's agreement (D-061).
  visionMissionValues: { label: 'Vision, Mission & Values', path: '/about/mission', ready: true },
  structure: { label: "OGSERC's Structure", path: '/about/structure', ready: true },
  contact: { label: 'Contact Us', path: '/contact', ready: true },
  licences: pending('Licences', '/licences'),
  faqs: pending('FAQs', '/faqs'),
  search: pending('Search', '/search'),
  consumerComplaint: pending('Consumer Complaint', '/consumer-complaint'),
  userProfile: pending('User Profile', '/user-profile'),
  regulatoryInstruments: pending('Regulatory Instruments', '/regulatory-instruments'),
  energyCaps: pending('Energy Caps', '/regulatory-instruments/energy-caps'),
  forms: { label: 'Forms', path: '/regulatory-instruments/forms', ready: true },
  ordersAndDirectives: {
    label: 'Orders & Directives',
    path: '/regulatory-instruments/orders-and-directives',
    ready: true,
  },
  news: pending('News', '/media-center/news'),
  tenders: pending('Tenders', '/media-center/tenders'),
  events: pending('Events', '/media-center/events'),
  // Not in the SRS Section 4 Media Center menu; added with the owner's agreement (D-065).
  notices: { label: 'Public Notices', path: '/media-center/notices', ready: true },
} satisfies Record<string, SiteLink>

const menuGroups: { id: string; label: string; links: SiteLink[] }[] = [
  {
    id: 'about',
    label: 'About OGSERC',
    links: [routes.about, routes.history, routes.visionMissionValues, routes.structure],
  },
  {
    id: 'regulatory-instruments',
    label: 'Regulatory Instruments',
    links: [
      pending('Rules & Regulations', '/regulatory-instruments/rules-and-regulations'),
      routes.energyCaps,
      pending('Guidelines', '/regulatory-instruments/guidelines'),
      routes.forms,
      pending('Consultation', '/regulatory-instruments/consultation'),
      pending('Licences', '/regulatory-instruments/licences'),
      routes.ordersAndDirectives,
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
      routes.notices,
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

const groupPages = (id: string): (ResolvedLink & { path: string })[] => {
  const found = menuGroups.find((g) => g.id === id)
  if (!found) throw new Error(`Unknown menu group: ${id}`)
  return found.links.map((link) => ({ ...resolve(link), path: link.path }))
}

/** The Regulatory Instruments categories, in menu order, for the document pages' sidebar. */
export const instrumentCategories = () => groupPages('regulatory-instruments')

/** The About OGSERC pages, in menu order, for the section's own navigation. */
export const aboutPages = () => groupPages('about')

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
  routes.about,
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
