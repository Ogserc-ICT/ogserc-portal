// Contact form fields, server-side validation and the email fallback (FR-CNT-02, D-059).
// Shared by the server action and the form, so it must stay free of server-only imports.

export const ENQUIRY_FIELDS = [
  'name',
  'email',
  'phone',
  'subject',
  'location',
  'enquiryType',
  'message',
] as const

export type EnquiryField = (typeof ENQUIRY_FIELDS)[number]
export type EnquiryValues = Record<EnquiryField, string>
export type EnquiryErrors = Partial<Record<EnquiryField, string>>

/** The hidden trap field. People never see it; bots that fill every field give themselves away. */
export const HONEYPOT_FIELD = 'website'

export const MAX_LENGTH: Record<EnquiryField, number> = {
  name: 100,
  email: 254,
  phone: 20,
  subject: 150,
  location: 100,
  enquiryType: 50,
  message: 5000,
}

export const ENQUIRY_LABELS: Record<EnquiryField, string> = {
  name: 'Full name',
  email: 'Email address',
  phone: 'Phone number',
  subject: 'Subject',
  location: 'Your location',
  enquiryType: 'Enquiry type',
  message: 'Message',
}

export const emptyEnquiry = (): EnquiryValues =>
  Object.fromEntries(ENQUIRY_FIELDS.map((field) => [field, ''])) as EnquiryValues

/**
 * Reads the fields as trimmed strings. Single-line fields have all whitespace (including line
 * breaks) collapsed to single spaces, so nothing typed can add lines to an email header later.
 */
export function readEnquiry(formData: FormData): EnquiryValues {
  const values = emptyEnquiry()
  for (const field of ENQUIRY_FIELDS) {
    const raw = formData.get(field)
    const text = typeof raw === 'string' ? raw : ''
    values[field] =
      field === 'message' ? text.replace(/\r\n?/g, '\n').trim() : text.replace(/\s+/g, ' ').trim()
  }
  return values
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[\d\s()-]{7,20}$/

export function validateEnquiry(values: EnquiryValues, enquiryTypes: string[]): EnquiryErrors {
  const errors: EnquiryErrors = {}

  if (!values.name) errors.name = 'Enter your full name'
  if (!values.email) errors.email = 'Enter your email address'
  else if (!EMAIL.test(values.email)) {
    errors.email = 'Enter an email address in the correct format, like name@example.com'
  }
  if (values.phone && !PHONE.test(values.phone)) {
    errors.phone = 'Enter a phone number using digits, like 0801 234 5678 or +234 801 234 5678'
  }
  if (values.enquiryType && !enquiryTypes.includes(values.enquiryType)) {
    errors.enquiryType = 'Choose an enquiry type from the list'
  }
  if (!values.message) errors.message = 'Enter your message'

  for (const field of ENQUIRY_FIELDS) {
    if (!errors[field] && values[field].length > MAX_LENGTH[field]) {
      errors[field] = `${ENQUIRY_LABELS[field]} must be ${MAX_LENGTH[field]} characters or fewer`
    }
  }
  return errors
}

/** A mailto: link carrying the visitor's message, for when the form cannot send it. */
export function mailtoFor(inbox: string, values: EnquiryValues): string {
  const subject = [values.enquiryType, values.subject].filter(Boolean).join(': ') || 'Enquiry'
  const details = [
    values.name && `Name: ${values.name}`,
    values.phone && `Phone: ${values.phone}`,
    values.location && `Location: ${values.location}`,
  ].filter(Boolean)
  const body = [values.message, details.length ? `\n${details.join('\n')}` : '']
    .filter(Boolean)
    .join('\n')
  return `mailto:${inbox}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export type ContactFormStatus = 'idle' | 'invalid' | 'resend' | 'unavailable' | 'sent'

export type ContactFormState = {
  status: ContactFormStatus
  values: EnquiryValues
  errors: EnquiryErrors
  /** The spam-check token the next submission sends back (see form-token.ts). */
  token: string
  /** Counts submissions, so the form re-renders with the values just sent. */
  submission: number
}
