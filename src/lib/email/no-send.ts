import type { EmailAdapter } from 'payload'

// The site sends no email (owner's choice, 2026-11-20, D-085): no mail provider, and not OGSERC's
// Microsoft 365. Payload's default without an adapter writes every email it would send to the log,
// including password-reset links (NFR-SEC-20). This adapter sends nothing and logs one fixed line
// that never contains the message, its recipient or a link.

export const EMAIL_OFF_LOG = 'Email sending is off (D-085): a message was not sent.'

export const noSendEmail: EmailAdapter = ({ payload }) => ({
  name: 'no-send',
  // Required by the interface; never used, because nothing is sent.
  defaultFromAddress: 'no-reply@example.invalid',
  defaultFromName: 'OGSERC',
  sendEmail: async () => {
    payload.logger.warn(EMAIL_OFF_LOG)
  },
})
