import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'
import { categoryCounts } from '@/lib/documents/store'
import { registrationForms } from '@/lib/forms/registration'
import { hrefFor, instrumentCategories, routes } from '@/lib/navigation'


/**
 * The Regulatory Instruments categories beside a document list or page. A row of pills that
 * scrolls sideways on phones, a sidebar list from 1024px. The current category is marked.
 * `min-w-0` keeps the pill row from widening its grid column, and `relative` on each link keeps
 * its screen-reader count inside the scrolling row; either would otherwise widen the whole page.
 */
export async function InstrumentNav({ currentPath }: { currentPath: string }) {
  const counts = await categoryCounts()
  // The registration forms are static files until step 6 slice 2 (D-063).
  const itemCount = (path: string): number => (path === routes.forms.path ? registrationForms.length : (counts.get(path) ?? 0))
  return (
    <nav aria-labelledby="instrument-types" className="min-w-0">
      <h2
        id="instrument-types"
        className="text-xs font-semibold tracking-widest text-ink-muted uppercase"
      >
        Instrument types
      </h2>
      <ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {instrumentCategories().map((category) => {
          const current = category.path === currentPath
          const count = itemCount(category.path)
          return (
            <li key={category.path} className="shrink-0">
              <Link
                href={category.href}
                aria-current={current ? 'page' : undefined}
                className={`relative flex min-h-11 items-center justify-between gap-3 rounded-lg px-4 py-2 text-sm whitespace-nowrap lg:whitespace-normal ${
                  current
                    ? 'bg-green-900 font-semibold text-white'
                    : 'border border-line bg-white text-ink hover:bg-green-50 lg:border-transparent lg:bg-transparent'
                }`}
              >
                {category.label}
                {count > 0 ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={current ? 'text-green-100' : 'text-ink-muted'}
                    >
                      {count}
                    </span>
                    <span className="sr-only">{` (${count} ${count === 1 ? 'document' : 'documents'})`}</span>
                  </>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        href={hrefFor(routes.regulatoryInstruments)}
        className="mt-2 flex min-h-11 items-center gap-2 px-4 text-sm text-green-700 underline-offset-4 hover:underline lg:mt-4 lg:border-t lg:border-line lg:pt-4"
      >
        <Icon name="arrowRight" className="size-4 rotate-180" />
        All instruments
      </Link>
    </nav>
  )
}
