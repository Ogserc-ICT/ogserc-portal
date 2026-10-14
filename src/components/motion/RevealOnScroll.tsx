'use client'

import { useEffect } from 'react'

/**
 * Subtle scroll-reveal for elements marked `data-reveal` (FR-WEB-10, D-039). Renders nothing.
 *
 * Content is never hidden by the server HTML: without JavaScript, before hydration, for
 * reduced-motion users and in browsers without IntersectionObserver, everything is simply visible.
 * After hydration, only elements that start below the viewport are faded out (so nothing on screen
 * flashes), and each fades back in once as it scrolls into view. The effect uses opacity and
 * transform only, which never cause layout shift.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      return
    }

    const below = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
      (el) => el.getBoundingClientRect().top > window.innerHeight,
    )
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.replace('reveal-pending', 'reveal-in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    for (const el of below) {
      el.classList.add('reveal-pending')
      observer.observe(el)
    }
    return () => {
      observer.disconnect()
      for (const el of below) el.classList.remove('reveal-pending', 'reveal-in')
    }
  }, [])

  return null
}
