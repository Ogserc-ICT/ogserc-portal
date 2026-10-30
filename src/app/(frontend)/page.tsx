import { ContactSection } from '@/components/home/ContactSection'
import { Hero } from '@/components/home/Hero'
import { LatestUpdates } from '@/components/home/LatestUpdates'
import { PublicNotices } from '@/components/home/PublicNotices'
import { QuickServices } from '@/components/home/QuickServices'
import { RevealOnScroll } from '@/components/motion/RevealOnScroll'
import { latestUpdates, notices } from '@/lib/placeholder-content'

// Homepage sections in FR-WEB-02 order. Header and footer come from the layout.
// Content comes from placeholder-content.ts until build step 4 connects the CMS.
// Tenders and Events are hidden until OGSERC has real ones (owner, 2026-10-30, D-062); their
// components stay in src/components/home/ for when they return.
export default function HomePage() {
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
