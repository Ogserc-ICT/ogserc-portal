// How to submit a registration form (D-063, D-066), from the Registration Form Selection Guide.
// The office hours come from the site settings (D-096).

/**
 * Forms page "How to submit" (D-063). The two ways to submit are the only ones: there is no online
 * portal. Address in the selection guide's own wording; hours reused from the contact page (owner,
 * 2026-10-30). Unknown details stay labelled placeholders.
 */
/** The registration notice, whose bank accounts the Forms page shows (D-066). */
export const REGISTRATION_NOTICE_SLUG = 'commencement-of-operations-and-mandatory-registration'

export const formsSubmission = {
  registry: '5th and 6th Floors, OPIC Building, Oke-Ilewo, Abeokuta',
  email: 'registration@ogserc.org.ng',
  // Hidden until OGSERC names one (owner, 2026-11-02, D-066); set a name to show it again.
  contactPerson: null as string | null,
}
