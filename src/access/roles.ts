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

/**
 * The user's roles, or an empty list for anything malformed (no user, no roles, or a value that
 * is not an array, such as a bare string). Unknown role names simply grant nothing.
 */
function rolesOf(user: unknown): readonly unknown[] {
  if (typeof user !== 'object' || user === null) return []
  const roles = (user as { roles?: unknown }).roles
  return Array.isArray(roles) ? roles : []
}

export function hasRole(user: unknown, role: Role): boolean {
  return rolesOf(user).includes(role)
}

/** True if any of the user's roles grants the capability. */
export function hasCapability(user: unknown, capability: Capability): boolean {
  const allowed: readonly unknown[] = CAPABILITIES[capability]
  return rolesOf(user).some((role) => allowed.includes(role))
}
