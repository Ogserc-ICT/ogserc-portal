import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { dateParts, formatDate } from '@/lib/format-date'
import { hrefFor, routes } from '@/lib/navigation'
import type { EventItem } from '@/lib/placeholder-content'

export function Events({ items }: { items: EventItem[] }) {
  return (
    <section data-reveal aria-labelledby="events-heading">
      <SectionHeading
        id="events-heading"
        title="Events"
        action={{ label: 'View all events', href: hrefFor(routes.events) }}
      />
      <ul className="space-y-4">
        {items.map((event) => {
          const { day, month } = dateParts(event.date)
          return (
            <li
              key={event.id}
              className="relative flex gap-4 rounded-lg border border-line bg-white p-4 shadow-sm transition duration-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 sm:p-5"
            >
              <div
                aria-hidden="true"
                className="flex size-16 shrink-0 flex-col items-center justify-center rounded-lg bg-green-900 text-white"
              >
                <span className="text-2xl leading-none font-bold">{day}</span>
                <span className="text-sm text-gold-400 uppercase">{month}</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg leading-snug font-semibold text-green-900">
                  <Link
                    href={event.href}
                    className="underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline"
                  >
                    {event.name}
                  </Link>
                </h3>
                <p className="text-sm text-ink-muted">
                  <time dateTime={event.date}>{formatDate(event.date)}</time>
                </p>
                <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <Icon name="mapPin" className="size-4 shrink-0" />
                  {event.venue}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
