import type { CollectionConfig } from 'payload'

import { denyAll, isAdmin } from '../access'
import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../lib/audit/actions'

// Who did what, and when (NFR-SEC-04, FR-CMS-05, Step 3 plan commit 5, D-083). Written only by
// server hooks (src/lib/audit/), read only by administrators. Nobody, administrators included,
// can create, edit or delete an entry through the admin panel or the API; the monthly job
// deploy/prune-audit.sh blanks addresses after 90 days and deletes entries after 2 years.
// Never holds a password, hash, token, reset link or file content.
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: 'Audit log entry', plural: 'Audit log' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'action', 'actorEmail', 'targetLabel', 'ipAddress'],
    description: 'A record of sign-ins and changes. Read-only: entries cannot be edited or deleted.',
    listSearchableFields: ['actorEmail', 'targetLabel'],
  },
  access: {
    read: isAdmin,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      index: true,
      options: AUDIT_ACTIONS.map(({ value, label }) => ({ value, label })),
      admin: { readOnly: true },
    },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, description: 'Who did it. Empty for a visitor who is not signed in, or for server code.' },
    },
    {
      name: 'actorEmail',
      type: 'text',
      admin: { readOnly: true, description: 'A copy, so the entry still reads correctly if the account is deleted.' },
    },
    {
      name: 'targetType',
      type: 'select',
      options: AUDIT_TARGET_TYPES.map(({ value, label }) => ({ value, label })),
      admin: { readOnly: true },
    },
    { name: 'targetId', type: 'text', index: true, admin: { readOnly: true } },
    {
      name: 'targetLabel',
      type: 'text',
      admin: { readOnly: true, description: "The account's email, the file's name or the item's title, at the time." },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: { readOnly: true, description: 'Blanked after 90 days.' },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: { readOnly: true, description: 'The browser. Blanked after 90 days.' },
    },
    {
      name: 'details',
      type: 'json',
      admin: { readOnly: true, description: 'Only field names, roles and reasons; never values of secrets.' },
    },
  ],
}
