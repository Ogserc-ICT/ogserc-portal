'use client'

import Image, { type StaticImageData } from 'next/image'
import { useEffect, useState, useSyncExternalStore, type FocusEvent } from 'react'

import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import type { HeroSlide } from '@/lib/placeholder-content'

type Slide = HeroSlide & { image: StaticImageData }

/** How long each slide shows before the next one fades in. Change it here only. */
export const HERO_INTERVAL_MS = 5000

/**
 * Homepage hero carousel (FR-WEB-08, D-037, D-042), following the WAI-ARIA carousel pattern.
 *
 * - The only control is a small pause/play button in the corner (WCAG 2.2.2). There are no
 *   previous/next arrows or slide dots, by the owner's choice (D-042).
 * - The server-rendered HTML shows slide 1 in full, so the page works without JavaScript.
 * - Only slide 1's photo loads with the page (preloaded, as the likely LCP image). The others are
 *   added after the page's load event.
 * - Autoplay is off for users who prefer reduced motion. It pauses while the pointer is over the
 *   carousel, and stops when keyboard focus enters it, until the user presses Play.
 * - All slides share one grid cell, so the hero's height never changes between slides.
 */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0)
  const [loadAll, setLoadAll] = useState(false)
  const [hovering, setHovering] = useState(false)
  // null until the user presses Pause/Play (or focus enters); then their choice wins.
  const [userPaused, setUserPaused] = useState<boolean | null>(null)
  const hydrated = useHydrated()
  const reducedMotion = usePrefersReducedMotion()
  const playing = userPaused === null ? !reducedMotion : !userPaused

  // Fetch the other photos once the page has finished loading, so they never compete with it.
  useEffect(() => {
    const load = () => setLoadAll(true)
    if (document.readyState === 'complete') {
      const id = setTimeout(load, 0)
      return () => clearTimeout(id)
    }
    window.addEventListener('load', load, { once: true })
    return () => window.removeEventListener('load', load)
  }, [])

  useEffect(() => {
    if (!hydrated || !playing || hovering) return
    const id = setInterval(() => {
      setLoadAll(true)
      setActive((i) => (i + 1) % slides.length)
    }, HERO_INTERVAL_MS)
    return () => clearInterval(id)
  }, [hydrated, playing, hovering, slides.length])

  // Keyboard focus entering the carousel stops rotation (except on the Pause/Play button itself).
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    if (!(event.target as HTMLElement).closest('[data-rotation-control]')) setUserPaused(true)
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className="on-dark relative isolate overflow-hidden bg-green-900 text-white"
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onFocus={onFocus}
    >
      {/* First in the carousel's tab order, as the WAI-ARIA pattern recommends; drawn in a corner. */}
      {hydrated ? (
        <RotationButton playing={playing} onToggle={() => setUserPaused(playing)} />
      ) : null}

      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {slides.map((slide, i) =>
          i === 0 || loadAll ? (
            <Image
              key={slide.id}
              src={slide.image}
              alt=""
              fill
              sizes="100vw"
              quality={60}
              preload={i === 0}
              className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
                i === active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : null,
        )}
        {/*
          Overlay for text contrast, checked against a pure-white pixel (the worst case):
          80% green-900 gives white text 6.4:1. On desktop it lightens only beyond the text column.
        */}
        <div className="absolute inset-0 bg-green-900/80 lg:bg-transparent lg:bg-linear-to-r lg:from-green-900/85 lg:via-green-900/80 lg:via-65% lg:to-green-900/40" />
      </div>

      <Container className="pt-12 pb-16 sm:pt-16 sm:pb-20 lg:py-24">
        <h1 className="text-sm font-semibold tracking-wide text-green-50 uppercase">
          Ogun State Electricity Regulatory Commission
        </h1>

        <div className="mt-3 grid" aria-live={playing ? 'off' : 'polite'}>
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
              inert={i !== active}
              className={`col-start-1 row-start-1 max-w-xl transition-opacity duration-700 motion-reduce:transition-none ${
                i === active ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <h2 className="text-3xl leading-tight font-bold sm:text-5xl">{slide.headline}</h2>
              {slide.text ? <p className="mt-4 text-lg text-green-50">{slide.text}</p> : null}
              <ButtonLink href={slide.action.href} className="mt-8">
                {slide.action.label}
                {slide.action.context ? (
                  <span className="sr-only"> {slide.action.context}</span>
                ) : null}
                <Icon name="arrowRight" className="size-5" />
              </ButtonLink>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

/**
 * The pause/play control (WCAG 2.2.2). The target is 44x44px; the visible disc is smaller so it
 * stays unobtrusive. Its icon is at least 6.8:1 against the disc even over the lightest part of
 * the overlay. The focus ring is gold with a dark green halo, so it stays visible over any photo.
 */
function RotationButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      data-rotation-control
      onClick={onToggle}
      aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
      className="group absolute right-2 bottom-2 z-10 inline-flex size-11 items-center justify-center rounded-full focus-visible:shadow-[0_0_0_7px_var(--color-green-900)] sm:right-4 sm:bottom-4"
    >
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-green-900/70 text-white transition-colors group-hover:bg-green-900">
        <Icon name={playing ? 'pause' : 'play'} className="size-4" />
      </span>
    </button>
  )
}

const noopSubscribe = () => () => {}

/** False during server rendering and hydration, true afterwards. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  )
}
