/**
 * Public notices, as issued by OGSERC (D-065). Like the Order (D-060), they sit in code until build
 * step 9 brings the Announcements collection; the step 4 seed must carry them into the CMS.
 *
 * Text is the notice as issued, except "license" is spelt "licence" to match the Order and the
 * rest of the site (owner, 2026-11-01), and the semicolon before the bank details is a colon.
 */

import { routes } from '@/lib/navigation'
import type { NoticeCategory } from '@/lib/placeholder-content'

export type NoticeSection = { heading: string; intro?: string; items?: string[]; outro?: string }

export type BankAccount = {
  accountName: string
  accountNumber: string
  bank: string
  description: string
  amount: string
}

export type PublicNotice = {
  slug: string
  category: NoticeCategory
  title: string
  /** The Order the notice is about, by catalogue slug. */
  orderSlug: string
  summary: string
  /** When the notice went up on the site; homepage lists sort by it. */
  postedDate: string
  issuedDate: string
  issuedAt: string
  sections: NoticeSection[]
  howToRegister: { intro: string; byHand: string; email: string }
  enquiries: string
  payment: { intro: string; accounts: BankAccount[] }
  closing: string
  signatories: string
}

const ACCOUNT_NAME = 'OGUN STATE ELECTRICITY REGULATORY COMMISSION'

/** The notice the Forms page takes its bank accounts from (D-066). */
export const REGISTRATION_NOTICE_SLUG = 'commencement-of-operations-and-mandatory-registration'

export const publicNotices: PublicNotice[] = [
  {
    slug: REGISTRATION_NOTICE_SLUG,
    category: 'Public notice',
    title: 'Commencement of Operations and Mandatory Registration of Electricity Operators',
    orderSlug: 'ogserc-ord-2026-001',
    summary:
      'From 2 November 2026 OGSERC regulates electricity in Ogun State. Who must register, the deadlines, fees and penalties, how to register and how to pay.',
    postedDate: '2026-11-01',
    issuedDate: '2026-10-26',
    issuedAt: 'Abeokuta',
    sections: [
      {
        heading: 'The Commission has begun operations',
        intro:
          "From 2 November 2026, OGSERC is the electricity regulator for Ogun State. It will issue and renew licences and permits, set tariffs, enforce standards, and handle consumer complaints. This follows NERC's transfer of oversight of the Ogun State market on 23 June 2025.",
      },
      {
        heading: 'Who must register',
        intro: 'Every person carrying out any of the following in Ogun State, licensed or not:',
        items: [
          'Electricity generation for sale, and own-use generation of 1 MW or more',
          'Distribution, supply or retail, and trading or bulk supply',
          'Mini-grids and independent distribution networks',
          'Private, estate, industrial-park or market networks that supply third parties',
          'Franchisees and sub-franchisees of distribution companies',
          'Metering services',
        ],
        outro:
          'Own-use generators of 200 kW to below 1 MW must file a simplified notification and pay ₦100,000. Own-use generators below 200 kW are exempt. Transmission and national-grid operations remain under NERC.',
      },
      {
        heading: 'Key deadlines',
        items: [
          'Existing operators: register within 60 days of 2 November 2026, that is, by 1 January 2027.',
          'New operators: register at least 30 days before starting an activity or energizing any asset.',
          'Multi-State licensees: within 90 days, submit a plan to ring-fence Ogun State operations, apply for an Ogun State licence, and register cross-boundary feeders and metering points.',
          'Unlicensed operators: register within 60 days and apply for a licence within 90 days to continue operating while the application is pending. Conditions apply: keep supply safe and continuous, make no new connections without approval, and charge no tariff above the one in force on 2 November 2026.',
        ],
      },
      {
        heading: 'What to expect',
        items: [
          'Registration is not a licence. It is a separate requirement.',
          'One-time fees range from ₦100,000 to ₦1,000,000 depending on category (non-refundable).',
          'Late registration: an initial charge of ₦100,000 to ₦1,000,000, plus daily charges of ₦10,000 to ₦200,000, capped at ₦2 million to ₦20 million depending on category. Thereafter the Commission may issue cease-and-desist orders, suspend or revoke licences, or refer matters for prosecution.',
          'False information may attract a penalty of up to ₦5,000,000, cancellation of registration, and prosecution.',
          'The Commission will give written notice and at least 14 days to respond before imposing penalties, except in safety emergencies. Affected parties may seek a review within 30 days.',
          'The Commission will decide complete applications within 30 days. Silence means provisional registration.',
          "Existing NERC licences, tariffs and regulations continue until replaced. No tariff may be changed without OGSERC's approval.",
          "Registered operators must publish OGSERC's complaint contact details on bills, websites and offices within 60 days.",
          'Registrants must report material changes within 14 days and file an annual confirmation by 31 January each year.',
        ],
      },
    ],
    howToRegister: {
      intro: 'Submit the Schedule 1 form with the Schedule 2 supporting documents:',
      byHand: '5th and 6th Floors, OPIC Building, Oke-Ilewo, Abeokuta',
      email: 'registration@ogserc.org.ng',
    },
    enquiries:
      'For registration-related enquiries and submissions, please use the designated email address:',
    payment: {
      intro: 'Also find below the account details to make payment into:',
      accounts: [
        {
          accountName: ACCOUNT_NAME,
          accountNumber: '1313352257',
          bank: 'Zenith Bank',
          description: 'Registration Application Processing Fees',
          amount: '50% of Applicable Registration Rate',
        },
        {
          accountName: ACCOUNT_NAME,
          accountNumber: '0150934805',
          bank: 'Sterling Bank',
          description: 'Registration Administrative Charges',
          amount: '50% of Applicable Registration Rate',
        },
      ],
    },
    closing: 'Thank you for your cooperation.',
    signatories: 'Jide Onakoya, Chairman/CEO, and Oluwatoyin Sonoiki, Secretary to the Commission.',
  },
]

export const findNotice = (slug: string): PublicNotice | undefined =>
  publicNotices.find((notice) => notice.slug === slug)

export const noticeHref = (notice: PublicNotice): string => `${routes.notices.path}/${notice.slug}`
