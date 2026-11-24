import type { Metadata } from 'next'
import { connection } from 'next/server'
import type { ReactNode } from 'react'

import { ContactForm } from '@/components/contact/ContactForm'
import { PageBand } from '@/components/layout/PageBand'
import { Container } from '@/components/ui/Container'
import { Icon, type IconName } from '@/components/ui/Icon'
import { OfficeMap } from '@/components/ui/OfficeMap'
import { Panel } from '@/components/ui/Panel'
import { issueFormToken } from '@/lib/contact/form-token'
import { contactDetails as readContactDetails, phoneHref } from '@/lib/cms/content'
import { enquiryTypes } from '@/lib/contact/enquiry-types'

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Contact the Ogun State Electricity Regulatory Commission: office address, phone, email, office hours and an enquiry form.',
}

const link = 'text-green-700 underline underline-offset-4'

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
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
        <Icon name={icon} className="size-5" />
      </span>
      <div>
        <p className="text-sm font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}

/** SRS 6.12 Contact (FR-CNT-01, FR-CNT-02); layout agreed with the owner (D-059). */
export default async function ContactPage() {
  const contactDetails = await readContactDetails()
  const contactPage = contactDetails
  // Rendered per request: the form's spam check starts timing when the page is opened.
  await connection()
  const token = issueFormToken()

  return (
    <>
      <PageBand
        breadcrumbs={[{ label: 'Contact us' }]}
        eyebrow="Get in touch"
        titleId="contact-title"
        title={
          <>
            Contact <span className="text-gold-400">OGSERC</span>
          </>
        }
      >
        <p className="mt-4 max-w-2xl text-lg text-green-50">{contactPage.introduction}</p>
      </PageBand>

      <div className="bg-green-50 py-12 sm:py-16">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-6">
            <Panel id="head-office" title="Head office">
              <address className="space-y-5 not-italic">
                <ContactRow icon="mapPin" label="Address">
                  {contactDetails.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </ContactRow>
                <ContactRow icon="phone" label="Phone">
                  <a href={phoneHref(contactDetails.phone)} className={link}>
                    {contactDetails.phone}
                  </a>
                </ContactRow>
                <ContactRow icon="mail" label="General enquiries">
                  <a href={`mailto:${contactDetails.email}`} className={link}>
                    {contactDetails.email}
                  </a>
                </ContactRow>
              </address>
            </Panel>

            <Panel id="departments" title="Department contacts">
              <ul className="space-y-4">
                {contactPage.departments.map((department) => (
                  <li key={department.name} className="rounded-lg bg-green-50 p-4">
                    <h3 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
                      {department.name}
                    </h3>
                    <a href={`mailto:${department.email}`} className={`mt-1 inline-block ${link}`}>
                      {department.email}
                    </a>
                    <p className="mt-2 text-sm text-ink-muted">{department.description}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              id="office-hours"
              title={
                <span className="flex items-center gap-2">
                  <Icon name="clock" className="size-5 text-green-700" />
                  Office hours
                </span>
              }
            >
              <dl className="space-y-3">
                {contactPage.officeHours.map((row) => (
                  <div key={row.days} className="flex flex-wrap justify-between gap-x-4">
                    <dt className="text-ink-muted">{row.days}</dt>
                    <dd className="font-semibold">{row.hours}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>

          <section
            aria-labelledby="send-message"
            className="rounded-lg border border-line bg-white p-6 sm:p-10"
          >
            <h2 id="send-message" className="text-2xl font-bold text-green-900">
              Send a message
            </h2>
            <p className="mt-2 mb-8 text-ink-muted">Fields marked (required) must be filled in.</p>
            <ContactForm token={token} inbox={contactDetails.email} enquiryTypes={enquiryTypes} />
          </section>
        </Container>

        <Container className="mt-12">
          <h2 className="mb-4 text-2xl font-bold text-green-900">Find us</h2>
          <OfficeMap {...contactDetails.map} className="h-80 sm:h-96" />
        </Container>
      </div>
    </>
  )
}
