'use client'

import Image, { type StaticImageData } from 'next/image'
import { useEffect, useState, useSyncExternalStore, type FocusEvent } from 'react'

import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import type { HeroSlide } from '@/lib/placeholder-content'

type Slide = HeroSlide & { image: StaticImageData }

const AUTOPLAY_MS = 7000

/**
 * Homepage hero carousel (FR-WEB-08, D-037), following the WAI-ARIA carousel pattern.
 *
 * - The server-rendered HTML shows slide 1 in full, so the page works without JavaScript.
 * - Only slide 1's photo loads with the page (preloaded, as the likely LCP image). The others are
 *   added after the page's load event, or as soon as the user moves to another slide.
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

  const go = (index: number) => {
    setLoadAll(true)
    setActive((index + slides.length) % slides.length)
  }

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
    }, AUTOPLAY_MS)
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

      <Container className="py-12 sm:py-16 lg:py-24">
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
                <Icon name="arrowRight" className="size-5" />
              </ButtonLink>
            </div>
          ))}
        </div>

        {/* Space is reserved before hydration so the controls never shift the layout. */}
        <div className="mt-8 flex min-h-11 flex-wrap items-center gap-2">
          {hydrated ? (
            <Controls
              count={slides.length}
              active={active}
              playing={playing}
              onGo={go}
              onTogglePlay={() => setUserPaused(playing)}
            />
          ) : null}
        </div>
      </Container>
    </section>
  )
}

type ControlsProps = {
  count: number
  active: number
  playing: boolean
  onGo: (index: number) => void
  onTogglePlay: () => void
}

const roundButton =
  'inline-flex size-11 items-center justify-center rounded-full border-2 border-white/80 text-white hover:bg-white/15'

function Controls({ count, active, playing, onGo, onTogglePlay }: ControlsProps) {
  return (
    <>
      <button
        type="button"
        data-rotation-control
        onClick={onTogglePlay}
        className={roundButton}
        aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
      >
        <Icon name={playing ? 'pause' : 'play'} className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => onGo(active - 1)}
        className={roundButton}
        aria-label="Previous slide"
      >
        <Icon name="chevronLeft" className="size-5" />
      </button>
      <ul className="flex items-center">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-label={`Show slide ${i + 1} of ${count}`}
              aria-current={i === active ? 'true' : undefined}
              className="group inline-flex size-11 items-center justify-center"
            >
              <span
                className={`block size-3 rounded-full border-2 border-white ${
                  i === active ? 'bg-gold-400' : 'bg-transparent group-hover:bg-white/40'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onGo(active + 1)}
        className={roundButton}
        aria-label="Next slide"
      >
        <Icon name="chevronRight" className="size-5" />
      </button>
    </>
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
