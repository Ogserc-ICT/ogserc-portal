/**
 * FR-WEB-06 legal pages (D-074): their addresses and titles, for the footer, the sitemap and the
 * pages themselves. Their text is in the CMS, in Pages entries with these web addresses (D-100).
 */
export type LegalRoute = { path: string; slug: string; title: string }

export const privacyPolicy: LegalRoute = { path: '/privacy-policy', slug: 'privacy-policy', title: 'Privacy Policy' }
export const termsOfService: LegalRoute = { path: '/terms-of-service', slug: 'terms-of-service', title: 'Terms of Service' }
