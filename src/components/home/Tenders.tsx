import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { formatDate } from '@/lib/format-date'
import { hrefFor, routes } from '@/lib/navigation'
import type { Tender } from '@/lib/placeholder-content'

export function Tenders({ items }: { items: Tender[] }) {
  return (
    <section data-reveal aria-labelledby="tenders-heading">
      <SectionHeading
        id="tenders-heading"
        title="Tenders"
        action={{ label: 'View all tenders', href: hrefFor(routes.tenders) }}
      />
      <ul className="space-y-4">
        {items.map((tender) => (
          <li key={tender.id}>
            <Card title={tender.title} href={tender.href} meta={tender.reference}>
              <p>
                Closing date:{' '}
                <time dateTime={tender.closingDate} className="font-semibold text-ink">
                  {formatDate(tender.closingDate)}
                </time>
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
