// The events the audit log records (D-083). Values are stored; labels are shown in the admin panel.
// Two-factor events since D-084; content and document-file events since Step 4 (D-090), the same
// actions for every content collection, told apart by the target type. A new value needs a
// migration (it is a Postgres enum).

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
  { value: '2fa.enrolled', label: 'Two-factor sign-in set up' },
  { value: '2fa.verified', label: 'Two-factor code accepted' },
  { value: '2fa.failed', label: 'Two-factor code refused' },
  { value: '2fa.removed', label: 'Two-factor sign-in removed' },
  { value: '2fa.reset', label: 'Two-factor sign-in reset by an administrator' },
  { value: 'media.created', label: 'Image uploaded' },
  { value: 'media.updated', label: 'Image changed' },
  { value: 'media.deleted', label: 'Image deleted' },
  { value: 'file.uploaded', label: 'Document file uploaded' },
  { value: 'file.updated', label: 'Document file changed' },
  { value: 'file.deleted', label: 'Document file deleted' },
  { value: 'content.created', label: 'Content created' },
  { value: 'content.draft-saved', label: 'Draft saved' },
  { value: 'content.published', label: 'Published' },
  { value: 'content.unpublished', label: 'Unpublished' },
  { value: 'content.deleted', label: 'Content deleted' },
] as const

/**
 * What an entry is about, with the label shown in the admin panel. Content collections use their
 * slug. A new value needs a migration (it is a Postgres enum), so each Step 4 collection adds its own.
 */
export const AUDIT_TARGET_TYPES = [
  { value: 'user', label: 'Staff account' },
  { value: 'media', label: 'Image' },
  { value: 'document-files', label: 'Document file' },
  { value: 'documents', label: 'Regulatory document' },
  { value: 'news', label: 'News story' },
  { value: 'events', label: 'Event' },
  { value: 'announcements', label: 'Announcement' },
  { value: 'tenders', label: 'Tender' },
  // Test-only collection (src/collections/test); its tables exist in every database, empty.
  { value: 'e2e-drafts', label: 'Test item (tests only)' },
] as const

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number]['value']

export type AuditAction = (typeof AUDIT_ACTIONS)[number]['value']
