import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { hrefFor, routes } from '@/lib/navigation'
import { hero } from '@/lib/placeholder-content'

/**
 * FR-WEB-02 hero: tagline and one primary action. Uses a brand gradient until OGSERC supplies a
 * photograph of electricity infrastructure (SRS 2.4); no image keeps the page light meanwhile.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="on-dark relative overflow-hidden bg-linear-to-br from-green-900 to-green-700 text-white"
    >
      <Icon
        name="bolt"
        fill="currentColor"
        stroke="none"
        className="pointer-events-none absolute -right-16 -bottom-24 size-96 text-gold-400/10 sm:right-8"
      />
      <Container className="relative py-14 sm:py-20 lg:py-28">
        <p className="text-sm font-semibold tracking-wide text-green-100 uppercase">
          Ogun State Electricity Regulatory Commission
        </p>
        <h1
          id="hero-heading"
          className="mt-3 max-w-3xl text-3xl leading-tight font-bold sm:text-5xl"
        >
          {hero.tagline}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-green-50">{hero.introduction}</p>
        <ButtonLink href={hrefFor(routes.consumerComplaint)} className="mt-8">
          {hero.actionLabel}
          <Icon name="arrowRight" className="size-5" />
        </ButtonLink>
      </Container>
    </section>
  )
}
