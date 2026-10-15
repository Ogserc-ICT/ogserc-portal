import { type CollectionBeforeValidateHook, type CollectionConfig, type FieldAccess, Forbidden } from 'payload'

import { isAdmin, isAdminOrSelf, isStaff, userCan } from '../access'
import { ROLES } from '../access/roles'
import { lockForTransaction } from '../lib/transaction-lock'

/** Only administrators may set roles, and never on their own account. */
const canSetRoles: FieldAccess = ({ req, id }) => {
  if (!userCan(req.user, 'users:manage')) return false
  return id === undefined || String(id) !== String(req.user?.id)
}

/**
 * The first account on an empty database (Payload's "create first user" screen) becomes an
 * administrator; that screen runs without a signed-in user, so it cannot pick a role itself.
 *
 * Payload checks "no users yet" before this hook, without a lock, so two simultaneous requests
 * could both pass. The lock makes the second wait until the first has committed; it then sees one
 * user and is refused.
 */
const firstUserIsAdministrator: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data || req.user) return data
  await lockForTransaction(req, 'users:first-user')
  const { totalDocs } = await req.payload.count({ collection: 'users', req })
  if (totalDocs === 0) {
    data.roles = ['administrator']
  } else if (req.payloadAPI !== 'local') {
    // Only first-register creates users over HTTP without a signed-in user.
    throw new Forbidden(req.t)
  }
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'roles'],
  },
  auth: {
    cookies: {
      // From NODE_ENV, not SITE_URL, so a production server never sends the session cookie
      // without Secure. Browsers accept Secure cookies on http://localhost, which CI uses.
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    admin: isStaff,
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
    unlock: isAdmin,
  },
  hooks: {
    beforeValidate: [firstUserIsAdministrator],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      options: [...ROLES],
      defaultValue: ['editor'],
      saveToJWT: true,
      access: {
        create: canSetRoles,
        update: canSetRoles,
      },
      admin: {
        description: 'Administrator: manages users and settings. Publisher: approves and publishes content. Editor: drafts content.',
      },
    },
  ],
}
