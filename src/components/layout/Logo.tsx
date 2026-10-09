import Image from 'next/image'
import Link from 'next/link'

import wordmark from '../../../public/brand/ogserc-wordmark.png'

/**
 * The OGSERC wordmark beside the commission's full name (SRS 2.4). The name is live text, so it
 * stays sharp at any size and is read by screen readers.
 */
export function Logo() {
  return (
    <Link
      href="/"
      className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4"
      aria-label="OGSERC, Ogun State Electricity Regulatory Commission: home"
    >
      <Image
        src={wordmark}
        alt=""
        loading="eager"
        fetchPriority="high"
        sizes="(min-width: 640px) 214px, 142px"
        className="h-8 w-auto sm:h-12"
      />
      <span className="max-w-56 text-xs leading-tight font-semibold tracking-wide text-ink uppercase sm:border-l-2 sm:border-line sm:pl-4 sm:text-sm">
        Ogun State Electricity Regulatory Commission
      </span>
    </Link>
  )
}
