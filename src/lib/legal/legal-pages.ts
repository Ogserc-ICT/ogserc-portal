/**
 * FR-WEB-06 legal pages, with the text OGSERC supplied on 2026-11-17 (D-074). Keep the wording as
 * supplied; changes come from OGSERC. Build step 4 moves these into the Pages collection, and the
 * seed must carry them over.
 */

export type LegalSection = {
  heading: string
  paragraphs: string[]
  /** A bulleted list shown after the paragraphs. */
  list?: string[]
  /** Words before the email address, rendered as "<emailLead> <email link>." */
  emailLead?: string
}

export type LegalPage = {
  path: string
  title: string
  description: string
  lastUpdated: string
  sections: LegalSection[]
}

export const privacyPolicy: LegalPage = {
  path: '/privacy-policy',
  title: 'Privacy Policy',
  description:
    'What information OGSERC collects when you use this platform, how it is used and how it is kept safe.',
  lastUpdated: 'November 2026',
  sections: [
    {
      heading: '1. Introduction',
      paragraphs: [
        'The Ogun State Electricity Regulatory Commission (OGSERC) is committed to protecting your privacy. This Privacy Policy explains what information we collect when you use this platform, how we use it and how we keep it safe.',
      ],
    },
    {
      heading: '2. Information We Collect',
      paragraphs: ['We may collect the following personal and usage information:'],
      list: [
        'Your name, email address, phone number and account profile details.',
        'Information you give us in complaints, petitions, forms and other submissions.',
        'Files and supporting documents you upload.',
        'Technical information such as your IP address, browser type and device details.',
      ],
    },
    {
      heading: '3. How We Use Your Information',
      paragraphs: ['We use the information we collect to:'],
      list: [
        'Provide and manage the regulatory services on this platform.',
        'Process your applications, complaints and other submissions.',
        'Send you status updates and notifications.',
        'Improve our services, our security and the support we give users.',
        'Meet our legal and regulatory obligations.',
      ],
    },
    {
      heading: '4. Sharing Your Information',
      paragraphs: [
        'We share your information only when it is needed for official processing, user support, security or legal compliance. We do not sell your personal information to anyone.',
      ],
    },
    {
      heading: '5. Keeping Your Data Secure',
      paragraphs: [
        'We use suitable technical and administrative safeguards to protect your data. No online system can be completely secure, but we keep reviewing and strengthening our protections.',
      ],
    },
    {
      heading: '6. Your Rights',
      paragraphs: [
        "You can ask us to correct any of your personal data that is inaccurate. You can also raise concerns about how your data is handled through OGSERC's official channels.",
      ],
    },
    {
      // Replaces the separate Cookie Notice (D-074). Not in OGSERC's supplied text yet. It should
      // also cover the cookie-free visitor statistics (Umami, D-077): pages viewed, referring site,
      // browser, device and country, no cookies, no profiles, words typed into site search kept.
      heading: '7. Cookies',
      paragraphs: ['[Sample, OGSERC to supply: cookies and visitor statistics]'],
    },
    {
      heading: '8. Contact Us',
      paragraphs: [],
      emailLead: 'For privacy questions, email',
    },
  ],
}

export const termsOfService: LegalPage = {
  path: '/terms-of-service',
  title: 'Terms of Service',
  description: 'The terms that apply when you visit or use the OGSERC platform.',
  lastUpdated: 'November 2026',
  sections: [
    {
      heading: '1. Agreement to These Terms',
      paragraphs: [
        'By visiting or using the Ogun State Electricity Regulatory Commission (OGSERC) platform, you accept these Terms of Service and agree to follow all applicable laws and regulations. If you do not agree, please do not use the platform.',
      ],
    },
    {
      heading: '2. Using the Platform',
      paragraphs: ['When you use this platform, you agree that:'],
      list: [
        'All information you submit will be true, correct and complete.',
        'You are responsible for everything done through your account, so keep your login details safe.',
        'You will not use the platform for any unauthorised, illegal or abusive purpose.',
      ],
    },
    {
      heading: '3. Submissions and Records',
      paragraphs: [
        'OGSERC uses the information and documents you submit through this platform to process regulatory matters and to communicate with you officially. OGSERC may keep these records for as long as the law requires.',
      ],
    },
    {
      heading: '4. Platform Availability',
      paragraphs: [
        'We work to keep the platform running smoothly and reliably. However, we cannot promise that it will always be available or free from interruptions and errors.',
      ],
    },
    {
      heading: '5. Limitation of Liability',
      paragraphs: [
        'Except where the law says otherwise, OGSERC is not responsible for any indirect or consequential loss that comes from using the platform or from being unable to use it.',
      ],
    },
    {
      heading: '6. Updates to These Terms',
      paragraphs: [
        'We may revise these terms from time to time. If you keep using the platform after we make changes, you accept the updated terms.',
      ],
    },
    {
      heading: '7. Contact Us',
      paragraphs: [],
      emailLead: 'For questions about these terms, email',
    },
  ],
}
