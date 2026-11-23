/**
 * Operators registered with OGSERC, in the order the Commission registered them (D-088).
 * Names and numbers exactly as OGSERC supplied them. Kept here until the Licencees collection
 * exists (build step 8), when staff will manage the list in the CMS.
 */
export type RegisteredOperator = {
  name: string
  registrationNumber: string
}

export const registeredOperators: RegisteredOperator[] = [
  { name: 'VERGE POWER LIMITED', registrationNumber: 'OGSERC/REG/2026/F-DIS/0001' },
]
