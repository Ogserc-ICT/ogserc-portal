import { CrestPlaceholder } from '@/components/layout/CrestPlaceholder'
import { Logo } from '@/components/layout/Logo'
import { MainNav } from '@/components/layout/MainNav'
import { UtilityBar } from '@/components/layout/UtilityBar'
import { Container } from '@/components/ui/Container'
import { mainMenu } from '@/lib/navigation'

export function SiteHeader() {
  return (
    <header>
      <UtilityBar />
      <Container className="flex items-center justify-between gap-4 py-3 sm:py-4">
        <Logo />
        <CrestPlaceholder />
      </Container>
      <MainNav entries={mainMenu} />
    </header>
  )
}
