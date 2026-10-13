import Image from 'next/image'
import Link from 'next/link'

import wordmark from '../../../public/brand/ogserc-wordmark.png'

/**
 * The OGSERC wordmark beside the commission's full name (SRS 2.4). The name is live text, so it
 * stays sharp at any size. Below lg only the wordmark shows, to keep the mobile header compact;
 * the link's accessible name always includes the full name.
 */
export function Logo() {
  return (
    <Link
      href="/"
      className="flex min-w-0 items-center gap-4"
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
      <span className="hidden max-w-56 border-l-2 border-line pl-4 text-sm leading-tight font-semibold tracking-wide text-ink uppercase lg:block">
        Ogun State Electricity Regulatory Commission
      </span>
    </Link>
  )
}
