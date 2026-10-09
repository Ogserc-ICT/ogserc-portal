import { ContactSection } from '@/components/home/ContactSection'
import { Events } from '@/components/home/Events'
import { Hero } from '@/components/home/Hero'
import { LatestUpdates } from '@/components/home/LatestUpdates'
import { PublicNotices } from '@/components/home/PublicNotices'
import { QuickServices } from '@/components/home/QuickServices'
import { Tenders } from '@/components/home/Tenders'
import { Container } from '@/components/ui/Container'
import { events, news, notices, tenders } from '@/lib/placeholder-content'

// Homepage sections in FR-WEB-02 order. Header and footer come from the layout.
// Content comes from placeholder-content.ts until build step 4 connects the CMS.
export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickServices />
      <LatestUpdates items={news} />
      <PublicNotices items={notices} />
      <div className="pb-12 sm:pb-16">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-8">
          <Tenders items={tenders} />
          <Events items={events} />
        </Container>
      </div>
      <ContactSection />
    </>
  )
}
