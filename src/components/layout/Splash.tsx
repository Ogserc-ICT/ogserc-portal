import Image from 'next/image'

import wordmark from '../../../public/brand/ogserc-wordmark.png'

import './splash.css'

/**
 * Logo splash, shown at most once per browser session (FR-WEB-09, D-038).
 *
 * The overlay is display: none unless SPLASH_SCRIPT (in the layout's <head>) adds `splash` to
 * <html> before the first paint. So without JavaScript, for reduced-motion users, when session
 * storage is unavailable, and on every later page in the session, nothing is shown. The page's
 * content is always in the HTML underneath, and the overlay ignores the pointer.
 */
export function Splash() {
  return (
    <div className="splash-screen" aria-hidden="true">
      {/*
        Same file, sizes and loading hints as the header logo (Logo.tsx), so it is fetched once and
        its preload keeps fetchPriority="high": React keeps only the first preload for a URL, and
        this one comes first in the page.
      */}
      <Image
        src={wordmark}
        alt=""
        loading="eager"
        fetchPriority="high"
        sizes="(min-width: 640px) 214px, 142px"
        className="h-12 w-auto"
      />
    </div>
  )
}

/**
 * Runs before first paint. Every sessionStorage call is inside try/catch: if storage is blocked
 * (private modes, strict privacy settings), the splash is skipped rather than shown on every page.
 * The splash ends on the load event; the 800ms hard cap is a CSS animation in splash.css, so it
 * holds even when the main thread is too busy to run timers on time.
 *
 * MUST be hashed (or replaced with an external file) when the strict Content-Security-Policy is
 * added in build step 12 (D-011, D-038). Any edit to this string changes its hash.
 */
export const SPLASH_SCRIPT = `(function(){var d=document.documentElement;try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var k='ogserc-splash-shown';if(window.sessionStorage.getItem(k))return;window.sessionStorage.setItem(k,'1')}catch(e){return}d.classList.add('splash');window.addEventListener('load',function(){d.classList.add('splash-done')},{once:true})})()`
