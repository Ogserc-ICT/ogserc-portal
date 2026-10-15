import type { CollectionBeforeValidateHook, CollectionConfig, FieldAccess } from 'payload'

import { isAdmin, isAdminOrSelf, isStaff, userCan } from '../access'
import { ROLES } from '../access/roles'

/** Only administrators may set roles, and never on their own account. */
const canSetRoles: FieldAccess = ({ req, id }) => {
  if (!userCan(req.user, 'users:manage')) return false
  return id === undefined || String(id) !== String(req.user?.id)
}

/**
 * The first account on an empty database (Payload's "create first user" screen) becomes an
 * administrator; that screen runs without a signed-in user, so it cannot pick a role itself.
 */
const firstUserIsAdministrator: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data) return data
  const { totalDocs } = await req.payload.count({ collection: 'users', req })
  if (totalDocs === 0) data.roles = ['administrator']
  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'roles'],
  },
  auth: true,
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
