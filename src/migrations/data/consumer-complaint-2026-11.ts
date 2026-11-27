// A frozen copy of the Consumer Complaint page's first text (FR-CON-01/02, D-101): a plain-English
// summary of OGSERC's draft Customer Service Standards and Protection Regulations, 2026 (the copy
// marked "Draft for Commission review", received 2026-11-25; docs/source/, not committed). Nothing
// here goes beyond what the draft says, except the one line marked "OGSERC to supply".
// 20261127_120000_consumer_complaint puts it into the Pages collection as a draft, unpublished until
// OGSERC confirms the Regulations are approved. Never edit: the migration must put in the same text
// wherever it runs. Each section's comment names the draft's sections it summarises, for checking.

/** A run of text: plain, bold, a link, or the complaints email (read from the site settings). */
export type Inline = string | { bold: string } | { link: string; url: string } | { email: true }
export type Block =
  | { h2: string }
  | { h3: string }
  | { p: Inline[] }
  | { ul: Inline[][] }
  | { ol: Inline[][] }

export const slug = 'consumer-complaint'
export const title = 'Consumer Complaint'
export const summary =
  'Your rights and obligations as an electricity customer in Ogun State, the service standards your electricity company must meet, and how to complain.'
/** Used if the site settings have no "complaints" department email when the migration runs. */
export const complaintsEmail = 'ccu@ogserc.org.ng'

export const blocks: Block[] = [
  // Citation, Application of these Regulations, Interpretation ("Service Provider").
  {
    p: [
      'This page summarises the Ogun State Electricity Regulatory Commission (Customer Service Standards and Protection) Regulations, 2026. They apply to every company licensed or permitted by OGSERC to supply electricity to customers in Ogun State, including distribution companies, energy retail companies and mini-grid operators. On this page, "your electricity company" means the company that supplies your electricity.',
    ],
  },
  { p: ['Where this summary and the Regulations differ, the Regulations apply.'] },

  // Application in respect of supply to an existing address; the service provider's obligation to
  // connect existing and new supply; Prohibition of the payment of fees; Billing; Routine meter
  // reading; Notice of disconnection; Redress for wrongful disconnection; Payment of bills;
  // Adjustment of bills; Notice of planned supply interruptions.
  { h2: 'Your rights' },
  { p: ['As a customer, you have the right to:'] },
  {
    ul: [
      ['Receive your electricity company\'s written terms and conditions of supply within 48 hours of applying for supply at a premises that is already connected, and be connected within 48 hours of applying.'],
      ['Have a meter installed and be connected within 10 working days of asking for a new or additional connection, once the company has inspected and approved your electrical installation.'],
      ['Pay nothing for the inspection, survey, testing and commissioning of your supply. Your electricity company provides the connection materials, the meter and its accessories.'],
      ['Receive bills in your name, in a format that is easy to understand, and no more than one routine bill in each billing period.'],
      ['Have your meter actually read every month, and never less than once every three months.'],
      ['Ask for your bill to be reviewed, and for a special meter reading if a reading looks wrong.'],
      ['Be told in writing within five working days if you have been overcharged, and have the exact amount credited to your next bill.'],
      ['Receive a receipt for every payment you make.'],
      ['Be told at least three working days in advance of a planned power cut for maintenance or repairs.'],
      ['Receive a written notice whenever your supply is disconnected, and be compensated if you are disconnected wrongly.'],
      ['Complain to your electricity company, and then to OGSERC if your complaint is not resolved.'],
    ],
  },

  // Application in respect of supply to an existing address; New connections; Payment of bills;
  // Arrangement to pay; Final meter reading; Conditions for disconnection; Prohibition of
  // disconnection (life support).
  { h2: 'Your obligations' },
  { p: ['As a customer, you are expected to:'] },
  {
    ul: [
      ['Apply for supply in your name, in the format your electricity company asks for, give it an acceptable means of identification and the information it needs, and accept its terms and conditions of supply.'],
      ['For a premises that has never been connected: apply in the name of the registered owner, provide a declaration of your supply requirements completed by an appropriate authority, and make sure your electrical installation meets the technical standards approved by the Commission.'],
      ['Pay your bills by the payment date shown on them. If you expect difficulty in paying a bill in full, contact your electricity company straight away to agree a payment arrangement.'],
      ['Give your electricity company access to read a meter that is inside your premises.'],
      ['Never connect to the network without authorisation or tamper with your meter.'],
      ['Ask for a final meter reading when you move out, and contact your electricity company when you move in.'],
      ['Tell your electricity company if a life support machine is used at your premises, and agree an arrangement with it for paying your bills.'],
    ],
  },
  {
    p: [
      'For billing, your electricity company\'s customer is the registered owner of the property, or a person the owner has authorised to use and pay for the electricity there.',
    ],
  },

  // Establishment of customer complaint units; Procedures of filing complaint; Complaints handling;
  // Procedures for the hearing of complaints; Decisions; Appeals.
  { h2: 'How to complain' },
  { p: ['Every complaint starts with your electricity company. If it is not resolved, OGSERC steps in.'] },
  {
    ol: [
      [
        { bold: 'Complain to your electricity company first.' },
        ' Contact its Customer Complaints Unit in writing, or by phone, text message, email, social media or any other channel the company publishes. It must acknowledge your complaint in a way you can trace. If you cannot write, its Complaints Officer will write your complaint down and read it back to you.',
      ],
      [
        { bold: 'The company resolves it.' },
        ' If your complaint is not resolved within 15 days, the company must write to you with its reasons and may take no more than 15 more days, unless the work needed, such as construction, takes longer. A complaint about meter accuracy or a bill reconciliation is resolved within one billing cycle of one month.',
      ],
      [
        { bold: 'Still not resolved after 30 days? Take it to OGSERC.' },
        ' Write to OGSERC\'s Customer Complaints Resolution Desk, by email or by letter, with the details listed under "What to include in your complaint" below. If you and your electricity company cannot agree on a resolution, either of you may refer the complaint to OGSERC.',
      ],
      [
        { bold: 'OGSERC acknowledges and hears your complaint.' },
        ' OGSERC registers your complaint and acknowledges it within three working days. It asks your electricity company to reply within ten working days, sets a date for a hearing and tells you both. Hearings may be held online. If you do not attend without a good reason, your complaint may be struck out.',
      ],
      [
        { bold: 'OGSERC decides.' },
        ' You receive a written decision within two months of OGSERC receiving your complaint, or a written explanation of the delay. OGSERC may order a refund of charges you should not have paid, the repair of defects, a remedy for the cause of any hardship, or the withdrawal of a hazardous service. Your electricity company must carry out the decision in the time set, and faces daily charges if it does not.',
      ],
      [
        { bold: 'Appeal, if you disagree.' },
        ' You may appeal to OGSERC within ten working days of the decision. If the decision requires you to pay an amount to your electricity company, you must pay it before your appeal can be heard.',
      ],
    ],
  },
  {
    p: [
      'A registered consumer organisation or non-governmental organisation may complain to OGSERC on your behalf, with your written authority. OGSERC may decline to hear a complaint it considers frivolous, vexatious or lacking in merit.',
    ],
  },

  // Schedule 3, Form 1 (Registration of Grievance).
  { h2: 'What to include in your complaint' },
  { p: ['When you complain to OGSERC, include:'] },
  {
    ul: [
      ['Your name, address and telephone number.'],
      ['Your complaint number from your electricity company\'s Customer Complaints Unit, if you have one.'],
      ['What the complaint is about: interruption of supply, voltage, load shedding, meter, billing, disconnection, delay in a new connection, or something else.'],
      ['A short description of the complaint, and any other relevant information.'],
      ['The date, and your signature.'],
    ],
  },

  // Chapter V: Restoration of supply; New connection; Estimation of connection charges; Planned
  // interruptions; Voltage complaints; Meter disputes; Reconnection after non-payment; Repositioning
  // of meters; Faults with pre-payment meters; Frequency of meter reading; Exceptions; Publication
  // of standards; Schedule 5 (the times).
  { h2: 'Service standards' },
  { p: ['Your electricity company must meet these standards:'] },
  {
    ul: [
      [{ bold: 'No electricity at your premises:' }, ' an official visits within 24 hours of your report during working hours.'],
      [{ bold: 'Failed fuse or minor fault on the company\'s equipment:' }, ' supply restored within 24 hours of your report.'],
      [{ bold: 'Any other fault on the company\'s equipment:' }, ' supply restored within 48 hours of your report.'],
      [{ bold: 'New or additional connection:' }, ' meter installed and supply connected within 10 working days of your request.'],
      [{ bold: 'Estimate of connection charges:' }, ' within 3 working days of your request for standard pricing, and within 5 working days otherwise.'],
      [{ bold: 'Planned power cuts:' }, ' at least 3 working days\' notice.'],
      [{ bold: 'Voltage problems' }, ' (lights too dim or too bright, equipment burning out): a visit within 24 hours of your report, any safety hazard dealt with immediately, and a full reply within 5 working days of the visit.'],
      [{ bold: 'Meter recording wrongly:' }, ' a visit within 3 working days of your report and a resolution within 5 working days of the visit. A faulty meter is replaced by the company.'],
      [{ bold: 'Prepayment meter not working properly:' }, ' a visit within 24 hours of your report during working hours, and the meter fixed or replaced where possible, unless you damaged it on purpose. A faulty metering system is repaired or replaced within 2 working days.'],
      [{ bold: 'Reconnection after disconnection for non-payment:' }, ' within 24 hours of your request, once you have paid the amount due or agreed a payment arrangement.'],
      [{ bold: 'Moving your meter:' }, ' within 5 working days, once the company has agreed and you have paid the charge. The meter stays in the same premises.'],
      [{ bold: 'Meter reading:' }, ' every month, and at least once every three months.'],
    ],
  },
  {
    p: [
      'The standards do not apply where, for example, you did not report the problem, the cause was your own electrical installation, you did not give information or pay charges the work depends on, or the company could not get access to your premises. They also do not apply during severe weather, industrial action by the company\'s staff, technical problems that could not reasonably have been foreseen, or other exceptional circumstances beyond the company\'s control.',
    ],
  },
  {
    p: [
      'Electricity companies report their performance against these standards to OGSERC every month, and OGSERC publishes how each company is performing.',
    ],
  },

  // Billing; Schedule 1 (Bill details); Conditions for disconnection (payment date); Adjustment of
  // bills; Payment of bills; Unmetered supply; Refund of wrongful charges; Security deposit; Refund
  // of security deposit; Arrangement to pay; Routine meter reading (estimates); Final meter reading;
  // Final bills; Faults with pre-payment meters (credit mode).
  { h2: 'Billing and meter reading' },
  { h3: 'What your bill must show' },
  {
    ul: [
      ['Your name, account number and supply address, and the number of every meter at that address.'],
      ['The date of the bill, the period it covers, your customer class and the tariff it is based on.'],
      ['The previous and present meter readings, their dates, and whether each was actual or estimated.'],
      ['The electricity used in kWh and its value in naira, with every other charge shown separately.'],
      ['Any arrears or credit brought forward, the total amount due and the payment date.'],
      ['A telephone number for billing enquiries, the company\'s complaint process, and the ways to pay.'],
    ],
  },
  {
    p: [
      'The payment date must be at least 10 days after the bill is delivered to you, in person or by an agreed electronic means such as a text message or email.',
    ],
  },
  { h3: 'If you think your bill is wrong' },
  {
    ul: [
      ['Ask your electricity company to review it. While the review goes on, you pay the average of your bills at that address over the previous twelve months, or over the time you have been there if it is less.'],
      ['If the bill is found to be correct, you either pay the balance or ask for your meter to be tested. If the test by NEMSA or another authorised test centre finds the meter is accurate, you pay the balance and the test fee.'],
      ['If the bill is wrong, the company corrects it. An overcharge is credited to your next bill; a corrected bill has a new payment date at least 10 days after it reaches you.'],
      ['If you were undercharged, the company must tell you in writing. It may recover no more than three months of the undercharge, without interest, and must give you at least as long to pay as the period the undercharge covered.'],
    ],
  },
  { h3: 'Estimated bills' },
  {
    p: [
      'Your bill should be based on an actual meter reading. If the company cannot read your meter, it must leave a notice at your premises saying so. An estimate is allowed only in exceptional circumstances, such as fire, a natural disaster, locked premises or civil unrest, for no more than one month and with the Commission\'s approval. It must reflect your usage over the previous three months and must never be inflated. If you have no meter, your bill is estimated by a method approved by the Commission, and any excess charged against that method is refunded at the next billing cycle.',
    ],
  },
  { h3: 'Paying your bill' },
  {
    p: [
      'Your electricity company must accept cash or a bank draft at its offices, and payment through any bank it has authorised, as well as any other method in its approved credit management policy. You may pay before you receive a bill. Every receipt must show your name, the supply address, your account number and the full amount paid.',
    ],
  },
  {
    p: [
      'If you cannot pay a bill in full by the payment date, contact the company straight away. It must offer you a payment arrangement, unless you failed to keep an arrangement in the previous six months. The arrangement is put in writing, with the amount and date of each instalment.',
    ],
  },
  { h3: 'Security deposits' },
  {
    p: [
      'A company may ask for a security deposit only from a customer with a credit meter and a recurring history of not paying bills. The deposit may not be more than your average consumption for two months. If a yearly review finds it is more than that, the excess is refunded within ten days of the review. When you move out, the deposit is set against your final bill, and any balance owed to you is refunded within ten working days.',
    ],
  },
  { h3: 'Moving house' },
  {
    p: [
      'Ask your electricity company for a final meter reading when you move out; it makes an appointment with you. If it misses the appointment, you pay only for electricity up to the date you said you would leave. No charges are made after your final bill, and a previous occupant\'s debt is never passed on to the next one: when you move in, you pay from the date your supply is reconnected.',
    ],
  },
  { h3: 'Prepayment meters' },
  {
    p: [
      'If your prepayment meter is set to run on credit, or comes loaded with units to be recovered, you must be told in advance. If it runs on credit without being set to do so and without your knowledge, you are not charged for the negative reading, and the meter is treated as faulty and replaced.',
    ],
  },

  // Disconnection of electricity supply; Conditions for disconnection; Customer's refusal to provide
  // identification or security deposit; Customer's right to request disconnection; Notice of
  // disconnection; Prohibition of disconnection; Redress for wrongful disconnection; Reconnection;
  // Disconnection for non-payment of bills (billing).
  { h2: 'Disconnection and reconnection' },
  { h3: 'When you can be disconnected' },
  {
    p: [
      'Your electricity company may disconnect you if you do not pay a bill by its payment date or break the terms you agreed with it. Before disconnecting you for non-payment, it must check that you have not paid, and the disconnection may not take place earlier than 2 working days after the payment date.',
    ],
  },
  {
    p: [
      'You may be disconnected without notice if you are connected to the network without authorisation, if your connection is dangerous to the network or affects other customers\' supply, or if you do not give access to read a meter inside your premises. A company may also refuse to supply you if you refuse to give an acceptable means of identification or to pay a security deposit it has asked for.',
    ],
  },
  { h3: 'When you must not be disconnected' },
  {
    ul: [
      ['You have paid the amount billed.'],
      ['You have a payment arrangement with the company and are keeping to it.'],
      ['You have complained about the unpaid bill and your complaint has not yet been resolved.'],
      ['The company knows a life support machine is used at your premises.'],
    ],
  },
  { h3: 'The disconnection notice' },
  {
    p: [
      'Whenever you are disconnected, the company must leave a written notice giving the date and time, the reason, what you need to do to be reconnected, and the address and telephone number of the team that will reconnect you. After a disconnection for non-payment, your bill is based on the meter reading at the time of disconnection, and nothing more is charged until you are reconnected.',
    ],
  },
  { h3: 'Wrongful disconnection' },
  {
    p: [
      'If you are disconnected against these rules, the company must compensate you with energy credits equal to your average daily consumption over the last three months, for each day the wrongful disconnection lasts.',
    ],
  },
  { h3: 'Getting reconnected' },
  {
    ul: [
      ['After non-payment: pay the charges due or agree a payment arrangement. You are reconnected within 24 hours of asking.'],
      ['After an unauthorised connection: put your supply arrangements right and pay the charges assessed, or agree a payment arrangement.'],
      ['After a dangerous installation: fix the problem, have the installation certified by an appropriate authority, and pay the charges assessed or agree a payment arrangement.'],
      ['After refusing access to your meter: give access and pay the reconnection fee.'],
    ],
  },
  { h3: 'Asking to be disconnected' },
  {
    p: [
      'You may ask your electricity company to disconnect your supply. It does so after checking that this will not affect others at the premises who need supply, and it may not bill you for any period after the date it should have disconnected you.',
    ],
  },

  // Schedule 2 (Charges/Fees); Prohibition of the payment of fees.
  { h2: 'Fees' },
  { p: ['The charges your electricity company may make are:'] },
  {
    ul: [
      [{ bold: 'Application processing:' }, ' ₦5,000.'],
      [{ bold: 'Reconnection:' }, ' ₦5,000.'],
      [{ bold: 'Moving a meter:' }, ' ₦25,000.'],
      [
        { bold: 'Meter tampering or an illegal connection:' },
        ' ₦100,000 for a single-phase meter, ₦200,000 for a three-phase connection and ₦1,000,000 for a maximum demand customer, or two times the average monthly bill (three times for a maximum demand customer), whichever is higher. A loss of revenue charge of up to three months from the date of the incident is added.',
      ],
    ],
  },
  { p: ['There is no charge for the inspection, survey, testing and commissioning of your supply.'] },

  // Voltage complaints; Conditions for disconnection (dangerous connection); Reconnection
  // (installation certified); Prohibition of disconnection (life support); Interpretation (meter
  // tampering, energy theft).
  { h2: 'Safety' },
  {
    ul: [
      ['Report lights that are too dim or too bright, or equipment burning out, to your electricity company. It must visit within 24 hours and deal with any safety hazard immediately.'],
      ['Make sure your electrical installation meets the approved technical standards. A dangerous installation can be disconnected, and is reconnected only after it has been fixed and certified.'],
      ['Never bypass your meter, interfere with it or its seals, or connect to the network without approval. This is dangerous, and it is meter tampering or energy theft.'],
      ['If anyone at your premises depends on a life support machine, tell your electricity company.'],
    ],
  },
  { p: ['[OGSERC to supply: general advice on electrical safety at home and at work.]'] },

  // Prohibition of the payment of fees; Routine meter reading; Final meter reading; Security
  // deposit; Arrangement to pay; Service provider's duty of notification (bills carry OGSERC's
  // details).
  { h2: 'Frequently asked questions' },
  { h3: 'Can my electricity company charge me for inspecting my premises?' },
  { p: ['No. The inspection, survey, testing and commissioning of your supply are free.'] },
  { h3: 'I moved into a house with unpaid electricity bills. Do I have to pay them?' },
  { p: ['No. A previous occupant\'s debt is never passed on to a new customer. You pay for electricity from the date your supply is reconnected.'] },
  { h3: 'Can my bill be estimated?' },
  { p: ['Only in exceptional circumstances, for no more than one month and with the Commission\'s approval. The estimate must be based on your usage over the previous three months and must never be inflated.'] },
  { h3: 'Can my electricity company ask me for a security deposit?' },
  { p: ['Only if you have a credit meter and a recurring history of not paying bills. It may not be more than your average consumption for two months.'] },
  { h3: 'Where do I find OGSERC\'s complaint contact details?' },
  { p: ['On every electricity bill, and below. Your electricity company must print OGSERC\'s address, telephone number and email address on your bills.'] },

  { h2: 'Contact OGSERC' },
  {
    p: [
      'For a complaint your electricity company has not resolved, email OGSERC\'s Customer Complaints Resolution Desk at ',
      { email: true },
      ' or write to us at our office. Our address, telephone number and office hours are on the ',
      { link: 'Contact Us', url: '/contact' },
      ' page.',
    ],
  },
]
