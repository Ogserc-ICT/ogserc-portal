'use client'

import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'

/**
 * Floating "Back to top" button (FR-WEB-13, D-043), an enhancement on the footer's plain
 * "Back to top" link, which works without JavaScript.
 *
 * One IntersectionObserver, no scroll listener: the button shows once a one-viewport-tall sentinel
 * at the top of the page has scrolled out of view, and hides whenever the footer is in view, so it
 * can never cover footer links or contact details (the footer's own link is there instead). While
 * hidden it is `visibility: hidden`, so it is out of the tab order and the accessibility tree.
 * Hidden while the menu drawer is open and when printing (globals.css, `print:hidden`).
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    const footer = document.querySelector('body > footer')
    if (!sentinel || !footer || !('IntersectionObserver' in window)) return

    let pastTop = false
    let footerInView = false
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === sentinel) {
          pastTop = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0
        } else {
          footerInView = entry.isIntersecting
        }
      }
      setVisible(pastTop && !footerInView)
    })
    observer.observe(sentinel)
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const onClick = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })
    // The skip link is the first focusable element, so the next Tab continues as on a fresh page.
    // preventScroll keeps the smooth scroll running.
    document.querySelector<HTMLElement>('a[href="#main"]')?.focus({ preventScroll: true })
  }

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 h-screen w-px"
      />
      <button
        type="button"
        aria-label="Back to top"
        onClick={onClick}
        className={`back-to-top fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 inline-flex size-11 items-center justify-center rounded-full bg-green-700 text-white shadow-md transition-[opacity,visibility,transform,background-color] duration-200 hover:bg-green-900 focus-visible:shadow-[0_0_0_7px_var(--color-green-900)] focus-visible:outline-gold-400 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none print:hidden ${
          visible ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <Icon name="arrowUp" className="size-5" />
      </button>
    </>
  )
}
