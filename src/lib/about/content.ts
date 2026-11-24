// The About OGSERC pages' text, as supplied by OGSERC (D-061, D-064). Moved out of
// placeholder-content.ts when the homepage moved to the CMS (D-096). Build step 5 (static information
// pages) decides how staff edit it; until then it is a TEMPORARY EXCEPTION to "content is edited in
// the CMS", listed in docs/RUNBOOK.md Section 11.

import type { IconName } from '@/components/ui/Icon'

/** Vision, mission and values (PRIDE), as supplied by OGSERC on 2026-10-29 (D-061). */
export const visionMissionValues = {
  vision:
    'A reliable, investable and fair electricity market that powers Ogun State’s homes and industries around the clock.',
  mission:
    'To regulate the Ogun State Electricity Market transparently and predictably, licensing capable operators, setting cost-reflective tariffs, enforcing service standards and protecting consumers.',
  values: [
    { name: 'Predictability', text: 'Rules published in advance, decisions consistent with them.' },
    { name: 'Responsiveness', text: 'Consumers and investors get answers within set timelines.' },
    { name: 'Integrity', text: 'Independent, conflict-free decision-making.' },
    { name: 'Data', text: 'Decisions grounded in measured performance, not assertion.' },
    { name: 'Excellence', text: 'A professional workforce held to clear standards.' },
  ],
}

/**
 * About Us, as supplied by OGSERC on 2026-11-01 (D-064). The short titles on the "What we do"
 * items are ours, drawn from each item, for scanning; OGSERC can change them.
 */
export const aboutUs = {
  introduction: [
    'The Ogun State Electricity Regulatory Commission (OGSERC) regulates the electricity market in Ogun State, independently of the operators it oversees. It was set up under the Ogun State Power Law, 2024. That law followed the Electricity Act, 2023, which gave Nigerian states the power to create and regulate their own electricity markets.',
    'OGSERC oversees the generation, transmission, distribution and supply of electricity within the state. Our job has two sides. Homes, businesses and industries in Ogun State should get power that is reliable, safe and fairly priced. Investors should have a stable, open environment to build in.',
  ],
  whatWeDo: [
    {
      title: 'Licensing',
      icon: 'licence',
      text: 'We issue and manage licences for electricity businesses operating in the state. These include distribution companies, generators, and embedded and off-grid operators.',
    },
    {
      title: 'Tariffs',
      icon: 'scales',
      text: 'We set and review tariffs. Prices should reflect efficient costs and protect consumers, while still letting licensees recover legitimate investment.',
    },
    {
      title: 'The Ogun State Electricity Market',
      icon: 'bolt',
      text: 'We are building the Ogun State Electricity Market (OGEM). This includes frameworks for third-party investment in distribution networks and for dedicated supply to industrial clusters.',
    },
    {
      title: 'Performance',
      icon: 'eye',
      text: 'We track how licensees perform on supply hours, metering, billing and service quality, and we hold them to account.',
    },
    {
      title: 'Consumer protection',
      icon: 'megaphone',
      text: 'We receive and resolve customer complaints, enforce service standards, and make sure consumers know their rights.',
    },
    {
      title: 'Regulations, codes and standards',
      icon: 'document',
      text: 'We make the regulations, codes and standards that govern safety, technical operations and commercial conduct in the market.',
    },
  ],
} satisfies {
  introduction: string[]
  whatWeDo: { title: string; icon: IconName; text: string }[]
}

/**
 * Our History, as supplied by OGSERC on 2026-11-01 (D-064). The key dates repeat the dates in
 * the text, nothing more.
 */
export const ourHistory = {
  paragraphs: [
    'OGSERC exists because of the Electricity Act, 2023. Until then, the federal government alone regulated electricity in Nigeria. The Act, which President Bola Tinubu signed, was the first decentralization of the power sector since the 2005 Electric Power Sector Reform Act, and it allowed states to set up and regulate their own electricity markets.',
    'The Ogun State House of Assembly took the bill, H.B.No.017/OG/2024 – Ogun State Power Sector Law, through second reading in August 2024 and held a stakeholders’ forum on it on 5 September 2024. The Assembly passed it on 12 September 2024, and Governor Dapo Abiodun signed it into law on 30 September 2024. The bill provided for an electricity market in the state and the main bodies to run it. It became the Ogun State Power Law, 2024, which established the Commission.',
    "The federal regulator handed over at the end of the year. Ogun State met the law's conditions, notified NERC, and asked it to transfer oversight of the intrastate market. NERC approved this with effect from 24 December 2024, and announced the order on 30 December 2024. The order told Eko Electricity Distribution Company, Ikeja Electric and Ibadan Electricity Distribution Company to form subsidiaries to take over intrastate supply and distribution in Ogun State. Those subsidiaries must get their licences from the state regulator, and every transfer under the order was due by 23 June 2025. NERC remains the regulator for interstate and international generation, transmission, supply, trading and system operations.",
  ],
  keyDates: [
    {
      date: '2023',
      text: 'The Electricity Act, 2023 allows states to regulate their own electricity markets.',
    },
    {
      date: 'August 2024',
      text: 'The Ogun State House of Assembly takes the bill through second reading.',
    },
    { date: '5 September 2024', text: 'The Assembly holds a stakeholders’ forum on the bill.' },
    { date: '12 September 2024', text: 'The Assembly passes the bill.' },
    {
      date: '30 September 2024',
      text: 'Governor Dapo Abiodun signs the Ogun State Power Law, 2024.',
    },
    {
      date: '24 December 2024',
      text: 'NERC’s transfer of oversight of the intrastate market takes effect.',
    },
    { date: '30 December 2024', text: 'NERC announces the order.' },
    { date: '23 June 2025', text: 'Every transfer under the order is due.' },
  ],
}

/**
 * OGSERC's Structure, as supplied by OGSERC on 2026-11-01 with its organogram (D-064). The units
 * under each division are copied from the organogram. The Office of the Chairman's units are the
 * three the organogram draws beside the Chairman / CEO.
 */
export const ogsercStructure = {
  introduction: [
    'The Law provided for a tenured appointment of five (5) Commissioners with one designated as the Executive Chairman. The Commissioners are nominated by the Governor and confirmed by the State House of Assembly.',
    'The Commission is made up of five (5) divisions each with a strategic role of maintaining the efficient operations of the Commission.',
  ],
  officeOfTheChairman: {
    name: 'Office of the Chairman',
    units: ['Internal Audit', 'Public Affairs and Stakeholder', 'Registry'],
  },
  divisions: [
    {
      name: 'Legal, Licensing and Consumer Affairs',
      units: ['Licensing', 'Compliance / Legal Services', 'Consumer Affairs'],
    },
    {
      name: 'Engineering Services',
      units: [
        'Engineering Standard',
        'Networks',
        'Performance Monitoring',
        'Occupational Health, Safety and Performance Analysis',
      ],
    },
    {
      name: 'Financial Management Services',
      units: ['Finance and Account', 'HR and Admin', 'ICT', 'Procurement'],
    },
    {
      name: 'Electricity Market, Planning and Research',
      units: ['Market Analysis', 'Tariff and Rates', 'Policy Planning and Innovation', 'Research'],
    },
  ],
}
