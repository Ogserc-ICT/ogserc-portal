// Staff roles and what each one may do (SRS Section 10, FR-CMS-06).
//
// Access checks ask for a capability, never a role name. To add a role (for example
// complaints-officer in Phase 2), add it to ROLES, grant it capabilities below, and create a
// migration for the new enum value. Existing collections and helpers do not change.

export const ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'editor', label: 'Editor' },
] as const

export type Role = (typeof ROLES)[number]['value']

export const ROLE_VALUES: Role[] = ROLES.map((role) => role.value)

const CAPABILITIES = {
  /** Sign in to the admin panel. */
  'admin:access': ['administrator', 'publisher', 'editor'],
  /** Create and edit content as drafts. */
  'content:edit': ['administrator', 'publisher', 'editor'],
  /** Approve, publish, unpublish and delete content. */
  'content:publish': ['administrator', 'publisher'],
  /** Create, edit and remove staff accounts and their roles. */
  'users:manage': ['administrator'],
  /** Read the audit log. */
  'audit:read': ['administrator'],
  /** Change site-wide settings. */
  'settings:manage': ['administrator'],
} as const satisfies Record<string, readonly Role[]>

export type Capability = keyof typeof CAPABILITIES

/** Anything with a roles list: the logged-in user, or a user document. */
type WithRoles = { roles?: readonly string[] | null } | null | undefined

export function hasRole(user: WithRoles, role: Role): boolean {
  return Boolean(user?.roles?.includes(role))
}

/** True if any of the user's roles grants the capability. */
export function hasCapability(user: WithRoles, capability: Capability): boolean {
  const allowed: readonly Role[] = CAPABILITIES[capability]
  return Boolean(user?.roles?.some((role) => allowed.includes(role as Role)))
}
