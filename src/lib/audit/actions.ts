// The events the audit log records (D-083). Values are stored; labels are shown in the admin panel.
// Two-factor events are added with two-factor authentication (Step 3 plan commit 6), and content
// events for each Step 4 collection through the same content hooks as Media.

export const AUDIT_ACTIONS = [
  { value: 'login.succeeded', label: 'Sign-in succeeded' },
  { value: 'login.failed', label: 'Sign-in failed' },
  { value: 'login.limited', label: 'Sign-in refused: too many attempts' },
  { value: 'account.locked', label: 'Account locked after failed sign-ins' },
  { value: 'account.unlocked', label: 'Account unlocked' },
  { value: 'logout', label: 'Signed out' },
  { value: 'password.reset-requested', label: 'Password reset requested' },
  { value: 'password.reset-completed', label: 'Password reset with a link' },
  { value: 'password.changed', label: 'Password changed' },
  { value: 'user.created', label: 'Account created' },
  { value: 'user.updated', label: 'Account updated' },
  { value: 'user.roles-changed', label: 'Roles changed' },
  { value: 'user.deleted', label: 'Account deleted' },
  { value: 'media.created', label: 'Image uploaded' },
  { value: 'media.updated', label: 'Image changed' },
  { value: 'media.deleted', label: 'Image deleted' },
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]['value']
