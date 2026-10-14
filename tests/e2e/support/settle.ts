import type { Page } from '@playwright/test'

/**
 * Brings the page to rest before an axe scan, so axe never measures colours mid-fade.
 *
 * Scroll-reveal (D-039) fades sections in over 500ms once they scroll into view. A scan that runs
 * during the fade measures text at partial opacity and reports false contrast failures; a scan
 * of a section still waiting to fade in (opacity 0) skips it, and checks nothing.
 *
 * 1. Every section still waiting to fade in is scrolled into view until it starts its fade, and
 *    then the original scroll position is restored, so the state under test is unchanged.
 * 2. Waits until no `[data-reveal]` element is pending and every finite animation and transition
 *    has finished (including the back-to-top fade, D-043).
 *
 * Call it after the page has hydrated (for example once a client-rendered control is visible):
 * scroll-reveal marks pending sections in an effect after hydration.
 */
export async function waitForSettledPage(page: Page) {
  await page.evaluate(async () => {
    const start = window.scrollY
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    for (const el of Array.from(document.querySelectorAll('.reveal-pending'))) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' })
      while (el.classList.contains('reveal-pending')) await nextFrame()
    }
    window.scrollTo({ top: start, behavior: 'instant' })
    // Let IntersectionObserver callbacks for the restored position run (and start any fades).
    await nextFrame()
    await nextFrame()
  })

  await page.waitForFunction(
    async () => {
      if (document.querySelector('[data-reveal].reveal-pending')) return false
      const finite = () =>
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
          .filter((a) => a.playState === 'running')
      // `finished` rejects if an animation is cancelled; either way it is no longer running.
      await Promise.all(finite().map((a) => a.finished.catch(() => undefined)))
      return finite().length === 0
    },
    undefined,
    { polling: 100 },
  )
}
