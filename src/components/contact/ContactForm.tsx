'use client'

import { useActionState, useEffect, useRef, type RefObject } from 'react'

import { submitEnquiry } from '@/app/(frontend)/contact/actions'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { Icon } from '@/components/ui/Icon'
import {
  ENQUIRY_FIELDS,
  HONEYPOT_FIELD,
  MAX_LENGTH,
  emptyEnquiry,
  mailtoFor,
  type ContactFormState,
  type EnquiryField,
} from '@/lib/contact/enquiry'

type ContactFormProps = {
  /** Spam-check token issued when the page was rendered. */
  token: string
  inbox: string
  enquiryTypes: string[]
}

const fieldId = (field: EnquiryField) => `contact-${field}`

/**
 * FR-CNT-02 enquiry form. Works without JavaScript (the page reloads with the result); with it,
 * focus moves to the result or the list of errors. The server decides everything (actions.ts).
 */
export function ContactForm({ token, inbox, enquiryTypes }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(submitEnquiry, {
    status: 'idle',
    values: emptyEnquiry(),
    errors: {},
    token,
    submission: 0,
  } satisfies ContactFormState)
  const noticeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.submission > 0) noticeRef.current?.focus()
  }, [state.submission])

  if (state.status === 'sent') {
    return (
      <div ref={noticeRef} tabIndex={-1} role="status" className="focus:outline-none">
        <p className="text-xl font-bold text-green-900">Thank you. Your message has been sent.</p>
        <p className="mt-2">The Commission will reply to the email address you gave.</p>
      </div>
    )
  }

  const { values, errors } = state
  const v = (field: EnquiryField) => ({ name: field, defaultValue: values[field] })

  return (
    <>
      <Notice state={state} inbox={inbox} noticeRef={noticeRef} />
      <form
        key={state.submission}
        action={formAction}
        noValidate
        className="relative grid gap-6 md:grid-cols-2"
      >
        <input type="hidden" name="token" value={state.token} />
        {/* The trap field: off-screen, skipped by keyboard and screen readers. */}
        <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
          <label htmlFor="contact-website">Leave this field empty</label>
          <input
            id="contact-website"
            name={HONEYPOT_FIELD}
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <Field id={fieldId('name')} label="Full name" required error={errors.name}>
          {(c) => (
            <Input
              id={c.id}
              {...v('name')}
              autoComplete="name"
              required
              maxLength={MAX_LENGTH.name}
              aria-describedby={c.describedBy}
              aria-invalid={c.invalid}
            />
          )}
        </Field>
        <Field id={fieldId('email')} label="Email address" required error={errors.email}>
          {(c) => (
            <Input
              id={c.id}
              {...v('email')}
              type="email"
              autoComplete="email"
              spellCheck={false}
              required
              maxLength={MAX_LENGTH.email}
              aria-describedby={c.describedBy}
              aria-invalid={c.invalid}
            />
          )}
        </Field>
        <Field id={fieldId('phone')} label="Phone number" error={errors.phone}>
          {(c) => (
            <Input
              id={c.id}
              {...v('phone')}
              type="tel"
              autoComplete="tel"
              maxLength={MAX_LENGTH.phone}
              aria-describedby={c.describedBy}
              aria-invalid={c.invalid}
            />
          )}
        </Field>
        <Field id={fieldId('subject')} label="Subject" error={errors.subject}>
          {(c) => (
            <Input
              id={c.id}
              {...v('subject')}
              maxLength={MAX_LENGTH.subject}
              aria-describedby={c.describedBy}
              aria-invalid={c.invalid}
            />
          )}
        </Field>
        <Field
          id={fieldId('location')}
          label="Your location"
          hint="For example, Abeokuta or Ijebu-Ode"
          error={errors.location}
        >
          {(c) => (
            <Input
              id={c.id}
              {...v('location')}
              autoComplete="address-level2"
              maxLength={MAX_LENGTH.location}
              aria-describedby={c.describedBy}
              aria-invalid={c.invalid}
            />
          )}
        </Field>
        <Field id={fieldId('enquiryType')} label="Enquiry type" error={errors.enquiryType}>
          {(c) => (
            <Select
              id={c.id}
              {...v('enquiryType')}
              aria-describedby={c.describedBy}
              aria-invalid={c.invalid}
            >
              <option value="">Select an option</option>
              {enquiryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="md:col-span-2">
          <Field id={fieldId('message')} label="Message" required error={errors.message}>
            {(c) => (
              <Textarea
                id={c.id}
                {...v('message')}
                rows={6}
                required
                maxLength={MAX_LENGTH.message}
                aria-describedby={c.describedBy}
                aria-invalid={c.invalid}
              />
            )}
          </Field>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" aria-disabled={pending || undefined}>
            <Icon name="send" className="size-5" />
            {pending ? 'Sending…' : 'Send message'}
          </Button>
        </div>
      </form>
    </>
  )
}

type NoticeProps = {
  state: ContactFormState
  inbox: string
  noticeRef: RefObject<HTMLDivElement | null>
}

/** The result of the last submission, focused when it appears. */
function Notice({ state, inbox, noticeRef }: NoticeProps) {
  const box = 'mb-8 rounded-lg border-l-4 p-4 focus:outline-none'

  if (state.status === 'invalid') {
    const fields = ENQUIRY_FIELDS.filter((field) => state.errors[field])
    return (
      <div
        ref={noticeRef}
        tabIndex={-1}
        aria-labelledby="contact-errors-heading"
        className={`${box} border-danger bg-white`}
      >
        <h3 id="contact-errors-heading" className="font-bold text-danger">
          There is a problem
        </h3>
        <ul className="mt-2 space-y-1">
          {fields.map((field) => (
            <li key={field}>
              <a href={`#${fieldId(field)}`} className="text-danger underline underline-offset-4">
                {state.errors[field]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (state.status === 'resend') {
    return (
      <div
        ref={noticeRef}
        tabIndex={-1}
        role="status"
        className={`${box} border-gold-500 bg-green-50`}
      >
        <p className="font-semibold text-green-900">Please check your message and send it again.</p>
      </div>
    )
  }

  if (state.status === 'unavailable') {
    return (
      <div
        ref={noticeRef}
        tabIndex={-1}
        role="status"
        className={`${box} border-gold-500 bg-green-50`}
      >
        <p className="font-semibold text-green-900">
          Sorry, the online form cannot send messages yet.
        </p>
        <p className="mt-2">
          Please email your message to{' '}
          <a href={`mailto:${inbox}`} className="text-green-700 underline underline-offset-4">
            {inbox}
          </a>
          . The button below opens your email app with your message already filled in.
        </p>
        <a href={mailtoFor(inbox, state.values)} className={buttonClasses('secondary', 'mt-4')}>
          <Icon name="mail" className="size-5" />
          Email your message
        </a>
      </div>
    )
  }

  return null
}
