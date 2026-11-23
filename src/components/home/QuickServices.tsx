import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { hrefFor, routes } from '@/lib/navigation'

// FR-WEB-02 quick services, in the order the SRS lists them, then Registered Operators (D-088).
const services: { label: string; href: string; icon: IconName }[] = [
  { label: 'Consumer Complaint', href: hrefFor(routes.consumerComplaint), icon: 'megaphone' },
  { label: 'Licences', href: hrefFor(routes.licences), icon: 'licence' },
  { label: 'Regulatory Instruments', href: hrefFor(routes.regulatoryInstruments), icon: 'scales' },
  { label: 'Energy Caps', href: hrefFor(routes.energyCaps), icon: 'bolt' },
  { label: 'FAQs', href: hrefFor(routes.faqs), icon: 'question' },
  { label: 'Registered Operators', href: hrefFor(routes.registeredOperators), icon: 'register' },
]

export function QuickServices() {
  return (
    <section data-reveal aria-labelledby="quick-services-heading" className="py-12 sm:py-16">
      <Container>
        <SectionHeading id="quick-services-heading" title="Quick services" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {services.map((service) => (
            <li key={service.label}>
              <Link
                href={service.href}
                className="group flex h-full min-h-32 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-white p-4 text-center font-semibold text-green-900 shadow-sm transition duration-200 hover:border-green-500 hover:shadow-md motion-safe:hover:-translate-y-0.5"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-green-50 text-green-700 transition-colors group-hover:bg-gold-400 group-hover:text-ink">
                  <Icon name={service.icon} className="size-6" />
                </span>
                {service.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
