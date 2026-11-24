'use server'

import {
  HONEYPOT_FIELD,
  emptyEnquiry,
  readEnquiry,
  validateEnquiry,
  type ContactFormState,
} from '@/lib/contact/enquiry'
import { checkFormToken, issueFormToken } from '@/lib/contact/form-token'
import { enquiryTypes } from '@/lib/contact/enquiry-types'

/**
 * Contact form submission (FR-CNT-02, D-059). Everything is checked here on the server; the
 * browser's checks are only a convenience. Nothing the visitor typed is logged.
 */
export async function submitEnquiry(
  previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const submission = previous.submission + 1
  const token = String(formData.get('token') ?? '')

  // A filled trap field means a bot: it is told the message was sent, and nothing is kept.
  if (String(formData.get(HONEYPOT_FIELD) ?? '') !== '') {
    return { status: 'sent', values: emptyEnquiry(), errors: {}, token, submission }
  }

  const values = readEnquiry(formData)
  const errors = validateEnquiry(values, enquiryTypes)
  if (Object.keys(errors).length > 0) {
    return { status: 'invalid', values, errors, token, submission }
  }

  const check = checkFormToken(token)
  if (check !== 'ok') {
    // Sent within seconds of opening the page, or from a page open for over a day: the visitor
    // is asked to send again. The message stays in the form.
    const nextToken = check === 'too-fast' ? token : issueFormToken()
    return { status: 'resend', values, errors: {}, token: nextToken, submission }
  }

  // Sending email is not set up yet (owner's choice, D-059): the form offers the visitor an
  // email link carrying their message instead. The sending slice adds rate limiting with it.
  return { status: 'unavailable', values, errors: {}, token, submission }
}
