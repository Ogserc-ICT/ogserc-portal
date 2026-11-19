import { Crest } from '@/components/layout/Crest'
import { Logo } from '@/components/layout/Logo'
import { MainNav } from '@/components/layout/MainNav'
import { MobileMenu } from '@/components/layout/MobileMenu'
import { UtilityBar } from '@/components/layout/UtilityBar'
import { Container } from '@/components/ui/Container'
import { mainMenu, utilityLinks } from '@/lib/navigation'

/**
 * Desktop (lg and up): utility bar, logo with the commission's name and the crest, then the green
 * six-item menu bar. Below lg: one compact row with the logo, the crest and the Menu button; the
 * menu and the utility links are in the drawer (D-036).
 */
export function SiteHeader() {
  return (
    <header>
      <UtilityBar />
      <Container className="flex items-center justify-between gap-3 py-3 lg:py-4">
        <Logo />
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Crest />
          <MobileMenu entries={mainMenu} utility={utilityLinks} />
        </div>
      </Container>
      <MainNav entries={mainMenu} />
    </header>
  )
}
