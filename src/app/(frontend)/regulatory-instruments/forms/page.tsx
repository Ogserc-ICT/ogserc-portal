import type { Metadata } from 'next'
import Link from 'next/link'

import { InstrumentNav } from '@/components/documents/InstrumentNav'
import { PageBand } from '@/components/layout/PageBand'
import { BankAccounts } from '@/components/notices/BankAccounts'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { buttonClasses } from '@/components/ui/Button'
import { documentHref, findDocument } from '@/lib/documents/catalogue'
import { formatDate } from '@/lib/format-date'
import {
  FORM_VERSION,
  type RegistrationForm,
  downloadLabel,
  formAnchor,
  formHref,
  registrationForms,
  registrationGuide,
} from '@/lib/forms/registration'
import { hrefFor, routes } from '@/lib/navigation'
import { contactDetails, findNotice, noticeHref } from '@/lib/cms/content'
import { REGISTRATION_NOTICE_SLUG, formsSubmission } from '@/lib/forms/submission'

const category = routes.forms
const ORDER_PATH = routes.ordersAndDirectives.path
const ORDER_SLUG = 'ogserc-ord-2026-001'

export const metadata: Metadata = {
  title: category.label,
  description:
    'Registration forms REG-01A to REG-01K under the OGSERC Commencement and Registration Order, 2026, with the guide to choosing your form.',
}

/**
 * Regulatory Instruments > Forms (D-063): the selection guide as text, then forms A to K with one
 * Word download each, then how to submit. Static files until build step 4 (FR-DOC-01).
 */
export default function FormsPage() {
  const order = findDocument(ORDER_PATH, ORDER_SLUG)
  if (!order) throw new Error(`Missing document ${ORDER_SLUG}`)

  return (
    <>
      <PageBand
        breadcrumbs={[
          {
            label: routes.regulatoryInstruments.label,
            href: hrefFor(routes.regulatoryInstruments),
          },
          { label: category.label },
        ]}
        eyebrow="Regulatory instruments"
        titleId="category-title"
        title={category.label}
      >
        <p className="mt-4 max-w-2xl text-lg text-green-50">
          Registration forms under{' '}
          <Link href={documentHref(order)} className="font-semibold underline underline-offset-4">
            Order {order.reference}
          </Link>
          : use the guide below to find your form, then download it.
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <InstrumentNav currentPath={category.path} />
          <div className="min-w-0 space-y-10">
            <SelectionGuide />
            <FormList />
            <HowToSubmit effectiveDate={order.effectiveDate} />
          </div>
        </Container>
      </div>
    </>
  )
}

/** The guide, exactly as docs/source/registration-guide.md. On phones each row is a card. */
function SelectionGuide() {
  const { columns } = registrationGuide
  return (
    <section
      aria-labelledby="guide-title"
      className="rounded-lg border border-line bg-white p-5 sm:p-8"
    >
      <p className="text-sm font-semibold tracking-wide text-ink-muted">
        {registrationGuide.organisation}
      </p>
      <h2 id="guide-title" className="mt-2 text-2xl font-bold text-green-900">
        {registrationGuide.title}
      </h2>

      {/*
        Explicit table roles keep the table semantics when phones change the display to blocks
        (some browsers drop them otherwise). The header row stays for screen readers only there.
      */}
      <table role="table" className="mt-4 block w-full text-left sm:table">
        <caption className="block text-left text-ink-muted italic sm:table-caption">
          {registrationGuide.subtitle}
        </caption>
        <thead role="rowgroup" className="sr-only sm:not-sr-only sm:table-header-group">
          <tr role="row" className="border-b-2 border-green-700">
            <th role="columnheader" scope="col" className="py-3 pr-4 font-semibold">
              <abbr title="Category" className="no-underline">
                {columns.category}
              </abbr>
            </th>
            <th role="columnheader" scope="col" className="py-3 pr-4 font-semibold">
              {columns.whoRegisters}
            </th>
            <th role="columnheader" scope="col" className="py-3 pr-4 font-semibold">
              {columns.form}
            </th>
            <th role="columnheader" scope="col" className="py-3 font-semibold whitespace-nowrap">
              {columns.fee}
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="mt-4 block space-y-3 sm:table-row-group sm:space-y-0">
          {registrationForms.map((form) => (
            <tr
              key={form.code}
              role="row"
              className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-line p-4 sm:table-row sm:rounded-none sm:border-0 sm:border-b sm:p-0"
            >
              <th
                role="rowheader"
                scope="row"
                className="row-span-3 text-2xl font-bold text-green-900 sm:py-3 sm:pr-4 sm:align-top sm:text-base"
              >
                {form.category}
              </th>
              <td role="cell" className="sm:py-3 sm:pr-4 sm:align-top">
                <CellLabel>{columns.whoRegisters}</CellLabel>
                {form.whoRegisters}
              </td>
              <td role="cell" className="sm:py-3 sm:pr-4 sm:align-top sm:whitespace-nowrap">
                <CellLabel>{columns.form}</CellLabel>
                <a
                  href={`#${formAnchor(form)}`}
                  className="font-semibold text-green-700 underline underline-offset-4"
                >
                  {form.code}
                </a>
              </td>
              <td role="cell" className="font-semibold sm:py-3 sm:align-top sm:whitespace-nowrap">
                <CellLabel>{columns.fee}</CellLabel>
                {form.fee}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <PaymentDetails />

      <h3 id="rules-title" className="mt-8 text-lg font-bold text-green-900">
        {registrationGuide.rulesTitle}
      </h3>
      <ul aria-labelledby="rules-title" className="mt-3 list-disc space-y-2 pl-5">
        {registrationGuide.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The bank accounts from the registration notice, set apart from the guide's own text (it is not
 * part of Form REG-GUIDE) and placed before the rules at the owner's request (D-066). Read from the
 * notice in the CMS (D-096), so a correction there shows here too; left out if the notice is not
 * published or has no accounts.
 */
async function PaymentDetails() {
  const notice = await findNotice(REGISTRATION_NOTICE_SLUG)
  const accounts = notice?.payment?.accounts ?? []
  if (!notice || accounts.length === 0) return null
  const issued = (notice.issuedDate ?? notice.postedDate).slice(0, 10)
  return (
    <section
      aria-labelledby="payment-details"
      className="mt-8 rounded-lg border-2 border-gold-400 bg-green-50 p-4 sm:p-6"
    >
      <h3 id="payment-details" className="text-xl font-bold text-green-900">
        Payment details
      </h3>
      <p className="mt-2 mb-4">
        From OGSERC&apos;s{' '}
        <Link
          href={noticeHref(notice)}
          className="font-semibold text-green-700 underline underline-offset-4"
        >
          public notice of {formatDate(issued)}
        </Link>
        :
      </p>
      <BankAccounts accounts={accounts} />
    </section>
  )
}

/** A cell's column name, shown on phones only; screen readers already hear the column header. */
function CellLabel({ children }: { children: string }) {
  return (
    <span aria-hidden="true" className="block text-xs font-semibold text-ink-muted sm:hidden">
      {children}
    </span>
  )
}

function FormList() {
  return (
    <section aria-labelledby="forms-title">
      <h2 id="forms-title" className="text-2xl font-bold text-green-900">
        Registration forms
      </h2>
      <ol className="mt-4 space-y-4">
        {registrationForms.map((form) => (
          <li key={form.code}>
            <FormEntry form={form} />
          </li>
        ))}
      </ol>
    </section>
  )
}

function FormEntry({ form }: { form: RegistrationForm }) {
  return (
    <article
      id={formAnchor(form)}
      aria-labelledby={`${formAnchor(form)}-title`}
      className="scroll-mt-6 rounded-lg border border-line bg-white p-5 sm:p-6"
    >
      <p className="text-sm font-semibold text-ink-muted">Category {form.category}</p>
      <h3 id={`${formAnchor(form)}-title`} className="mt-1 text-lg font-bold text-green-900">
        {form.code}: {form.title}
      </h3>
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-ink-muted">Who it is for</dt>
        <dd>{form.whoRegisters}</dd>
        <dt className="text-ink-muted">Fee</dt>
        <dd className="font-semibold">{form.fee}</dd>
        <dt className="text-ink-muted">Version</dt>
        <dd>{FORM_VERSION}</dd>
      </dl>
      <a
        href={formHref(form)}
        download={form.fileName}
        className={buttonClasses('secondary', 'mt-5 text-left')}
      >
        <Icon name="download" className="size-4 shrink-0" />
        {downloadLabel(form)}
      </a>
    </article>
  )
}

async function HowToSubmit({ effectiveDate }: { effectiveDate?: string }) {
  const { registry, email, contactPerson } = formsSubmission
  const { officeHours } = await contactDetails()
  return (
    <section
      aria-labelledby="how-to-submit"
      className="rounded-lg border-2 border-green-700 bg-white p-5 sm:p-8"
    >
      <h2 id="how-to-submit" className="text-2xl font-bold text-green-900">
        How to submit
      </h2>
      <p className="mt-3">Submit your completed form in one of these two ways:</p>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2">
        <li className="rounded-lg bg-green-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-green-900">
            <Icon name="mapPin" className="size-5 shrink-0" />
            By hand at the Commission&apos;s Registry
          </p>
          <p className="mt-2">{registry}</p>
          <dl className="mt-3 space-y-1 text-sm">
            {officeHours.map((row) => (
              <div key={row.days} className="flex flex-wrap justify-between gap-x-4">
                <dt className="text-ink-muted">{row.days}</dt>
                <dd className="font-semibold">{row.hours}</dd>
              </div>
            ))}
          </dl>
        </li>
        <li className="rounded-lg bg-green-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-green-900">
            <Icon name="mail" className="size-5 shrink-0" />
            By email
          </p>
          <p className="mt-2">
            <a
              href={`mailto:${email}`}
              className="font-semibold break-all text-green-700 underline underline-offset-4"
            >
              {email}
            </a>
          </p>
        </li>
      </ol>
      <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        {effectiveDate ? (
          <>
            <dt className="text-ink-muted">Effective date</dt>
            <dd>
              <time dateTime={effectiveDate}>{formatDate(effectiveDate)}</time>
            </dd>
          </>
        ) : null}
        {contactPerson ? (
          <>
            <dt className="text-ink-muted">Contact person</dt>
            <dd>{contactPerson}</dd>
          </>
        ) : null}
      </dl>
    </section>
  )
}
