import { ContactSection } from '@/components/home/ContactSection'
import { Hero } from '@/components/home/Hero'
import { LatestUpdates } from '@/components/home/LatestUpdates'
import { PublicNotices } from '@/components/home/PublicNotices'
import { QuickServices } from '@/components/home/QuickServices'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { listNews, listNotices } from '@/lib/cms/content'

// Homepage sections in FR-WEB-02 order. Header and footer come from the layout. Everything comes
// from the CMS (D-096): the slides and contact details from the site settings, the lists from News
// and Announcements, published items only.
// Tenders and Events are hidden until OGSERC has real ones (owner, 2026-10-30, D-062); their
// components stay in src/components/home/ for when they return.
/** How many items each homepage list shows; the News and Notices pages list the rest. */
const HOMEPAGE_ITEMS = { news: 6, notices: 5 }

export default async function HomePage() {
  const [latestUpdates, notices] = await Promise.all([listNews(HOMEPAGE_ITEMS.news), listNotices(HOMEPAGE_ITEMS.notices)])
  return (
    <>
      <Hero />
      <QuickServices />
      <LatestUpdates items={latestUpdates} />
      <PublicNotices items={notices} />
      <ContactSection />
      <RevealOnScroll />
    </>
  )
}
