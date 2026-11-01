import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { aboutPages } from '@/lib/navigation'

/**
 * The About OGSERC pages as a row of links under the page band, the current page marked. The row
 * scrolls sideways on phones and wraps from 640px; `min-w-0` keeps it from widening the page.
 */
export function AboutNav({ currentPath }: { currentPath: string }) {
  return (
    <nav aria-label="About OGSERC" className="border-b border-line bg-white">
      <Container className="min-w-0">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {aboutPages().map((link) => {
            const current = link.path === currentPath
            return (
              <li key={link.path} className="shrink-0">
                <Link
                  href={link.href}
                  aria-current={current ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded-lg px-4 py-2 text-sm whitespace-nowrap ${
                    current
                      ? 'bg-green-900 font-semibold text-white'
                      : 'border border-line text-ink hover:bg-green-50'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </Container>
    </nav>
  )
}
