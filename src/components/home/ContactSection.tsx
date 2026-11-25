import type { ReactNode } from 'react'

import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { OfficeMap } from '@/components/ui/OfficeMap'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { hrefFor, routes } from '@/lib/navigation'
import { contactDetails as readContactDetails, phoneHref } from '@/lib/cms/content'

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: IconName
  label: string
  children: ReactNode
}) {
  return (
    <li className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-green-700">
        <Icon name={icon} className="size-5" />
      </span>
      <div>
        <p className="font-semibold text-green-900">{label}</p>
        <p>{children}</p>
      </div>
    </li>
  )
}

/** FR-WEB-02 contact: office, phone, email, map. */
export async function ContactSection() {
  const contactDetails = await readContactDetails()
  return (
    <section data-reveal aria-labelledby="contact-heading" className="bg-green-50 py-12 sm:py-16">
      <Container className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <SectionHeading id="contact-heading" title="Contact us" />
          <ul className="space-y-5">
            <ContactRow icon="mapPin" label="Office">
              {contactDetails.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </ContactRow>
            <ContactRow icon="phone" label="Phone">
              <a href={phoneHref(contactDetails.phone)} className="text-green-700 underline underline-offset-4">
                {contactDetails.phone}
              </a>
            </ContactRow>
            <ContactRow icon="mail" label="Email">
              <a
                href={`mailto:${contactDetails.email}`}
                className="text-green-700 underline underline-offset-4"
              >
                {contactDetails.email}
              </a>
            </ContactRow>
          </ul>
          <ButtonLink href={hrefFor(routes.contact)} variant="secondary" className="mt-8">
            Contact page
            <Icon name="arrowRight" className="size-5" />
          </ButtonLink>
        </div>
        <OfficeMap {...contactDetails.map} className="min-h-72 lg:min-h-0" />
      </Container>
    </section>
  )
}
