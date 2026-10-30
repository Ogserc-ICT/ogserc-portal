import { statSync } from 'node:fs'
import path from 'node:path'

/**
 * TEMPORARY EXCEPTION, like the documents catalogue (D-028, D-060, D-063): OGSERC's registration
 * forms before the Documents collection exists. Build step 4 moves them into the CMS (category
 * Forms) and keeps these download addresses working.
 *
 * The guide text is copied exactly from docs/source/registration-guide.md (Form REG-GUIDE,
 * Version 2026.1). Do not rephrase, round or reorder any of it: tests compare it with that file.
 */

export const FORMS_DIRECTORY = '/forms/registration'
export const FORM_VERSION = '2026.1'

export type RegistrationForm = {
  /** Schedule 3 category letter. */
  category: string
  /** "REG-01C". */
  code: string
  /** The guide's "Who registers" column. */
  whoRegisters: string
  /** The guide's "Fee" column. */
  fee: string
  /** The form's own title, in sentence case (D-063). */
  title: string
  /** OGSERC's file name in public/forms/registration/, unchanged (D-063). */
  fileName: string
}

export const registrationGuide = {
  organisation: 'OGUN STATE ELECTRICITY REGULATORY COMMISSION',
  title: 'REGISTRATION FORM SELECTION GUIDE',
  subtitle:
    'Which form to file under the OGSERC Commencement and Registration Order, 2026 (Schedule 3 categories)',
  columns: { category: 'Cat.', whoRegisters: 'Who registers', form: 'Form', fee: 'Fee' },
  rulesTitle: 'Rules for choosing',
  rules: [
    'One registration covers all your activities and locations in Ogun State (para 11(4)).',
    'If you fall into more than one category, file the form for the highest category and tick your other activities; the fee for the highest category applies (para 17(1)).',
    'A successor distribution company always files REG-01A, and an integrated utility REG-01B, for all their activities in Ogun State (para 17(1)).',
    'Own-use generation below 200 kW: nothing to file. 200 kW to below 1 MW: REG-01I. 1 MW or more: REG-01D or REG-01C, even if used only on site.',
    'Late registration: Categories A, B, C, F and G — ₦1,000,000 plus ₦200,000 a day (cap ₦20m); D, E, H and J — ₦500,000 plus ₦100,000 a day (cap ₦10m); K — ₦100,000 plus ₦10,000 a day (cap ₦2m) (Schedule 3, Part B).',
  ],
}

export const registrationForms: RegistrationForm[] = [
  {
    category: 'A',
    code: 'REG-01A',
    whoRegisters:
      'Successor distribution companies, including a multi-State licensee that is a successor distribution company, for all their activities in Ogun State',
    fee: '₦1,000,000',
    title: 'Successor distribution companies',
    fileName: 'OGSERC_Form_REG-01A_Successor_Distribution_Company.docx',
  },
  {
    category: 'B',
    code: 'REG-01B',
    whoRegisters: 'Integrated utilities, for all their activities in Ogun State',
    fee: '₦1,000,000',
    title: 'Integrated utilities',
    fileName: 'OGSERC_Form_REG-01B_Integrated_Utility.docx',
  },
  {
    category: 'C',
    code: 'REG-01C',
    whoRegisters: 'Generation of 10 MW or more, whether for sale or captive use',
    fee: '₦500,000',
    title: 'Generation of 10 MW or more',
    fileName: 'OGSERC_Form_REG-01C_Generation_10MW_and_above.docx',
  },
  {
    category: 'D',
    code: 'REG-01D',
    whoRegisters: 'Generation of 1 MW to less than 10 MW, whether for sale or captive use',
    fee: '₦300,000',
    title: 'Generation of 1 MW to below 10 MW',
    fileName: 'OGSERC_Form_REG-01D_Generation_1MW_to_below_10MW.docx',
  },
  {
    category: 'E',
    code: 'REG-01E',
    whoRegisters: 'Mini-grids and interconnected mini-grids',
    fee: '₦250,000',
    title: 'Mini-grids',
    fileName: 'OGSERC_Form_REG-01E_Mini-Grid.docx',
  },
  {
    category: 'F',
    code: 'REG-01F',
    whoRegisters:
      'Distribution licensees other than successor distribution companies; trading and bulk supply',
    fee: '₦500,000',
    title: 'Other distribution licensees, trading and bulk supply',
    fileName: 'OGSERC_Form_REG-01F_Other_Distribution_Trading_Bulk_Supply.docx',
  },
  {
    category: 'G',
    code: 'REG-01G',
    whoRegisters: 'Private, estate and industrial-park networks',
    fee: '₦500,000',
    title: 'Private, estate and industrial-park networks',
    fileName: 'OGSERC_Form_REG-01G_Private_Estate_Industrial_Park_Networks.docx',
  },
  {
    category: 'H',
    code: 'REG-01H',
    whoRegisters: 'Metering service providers',
    fee: '₦250,000',
    title: 'Metering service providers',
    fileName: 'OGSERC_Form_REG-01H_Metering_Service_Providers.docx',
  },
  {
    category: 'I',
    code: 'REG-01I',
    whoRegisters: 'Own-use generation notification under paragraph 3(4) (200 kW to below 1 MW)',
    fee: '₦100,000',
    title: 'Own-use generation notification',
    fileName: 'OGSERC_Form_REG-01I_Own-Use_Generation_Notification.docx',
  },
  {
    category: 'J',
    code: 'REG-01J',
    whoRegisters: 'Franchisees and sub-franchisees',
    fee: '₦250,000',
    title: 'Franchisees and sub-franchisees',
    fileName: 'OGSERC_Form_REG-01J_Franchisees_and_Sub-Franchisees.docx',
  },
  {
    category: 'K',
    code: 'REG-01K',
    whoRegisters: 'Any other activity below 1 MW',
    fee: '₦100,000',
    title: 'Other activities below 1 MW',
    fileName: 'OGSERC_Form_REG-01K_Other_Activities_below_1MW.docx',
  },
]

/** "reg-01c": the form's anchor on the Forms page. */
export const formAnchor = (form: RegistrationForm): string => form.code.toLowerCase()

export const formHref = (form: RegistrationForm): string => `${FORMS_DIRECTORY}/${form.fileName}`

/**
 * The file's size in decimal kilobytes ("406 KB"), read from public/ when the page is built, so it
 * can never drift from the file.
 */
export const formFileSize = (form: RegistrationForm): string => {
  const bytes = statSync(path.join(process.cwd(), 'public', FORMS_DIRECTORY, form.fileName)).size
  return `${Math.round(bytes / 1000)} KB`
}

/** "Download REG-01C (Generation of 10 MW or more), Word, 406 KB". */
export const downloadLabel = (form: RegistrationForm): string =>
  `Download ${form.code} (${form.title}), Word, ${formFileSize(form)}`
