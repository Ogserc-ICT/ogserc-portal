import type { CollectionConfig, SanitizedConfig } from 'payload'

import { denyAll, isStaff } from './index'

// Payload adds its own collections after plugins run, so denyByDefault never sees them. Some use
// Payload's "any logged-in user" default, which would also admit users of a future public auth
// collection (Phase 2). This pass runs on the finished config and narrows them to staff.

type Access = NonNullable<CollectionConfig['access']>

const OVERRIDES: Record<string, Access> = {
  // Shows who is editing which document; the admin panel needs it for staff only.
  'payload-locked-documents': { create: isStaff, read: isStaff, update: isStaff, delete: isStaff },
  // Read, update and delete already limit each user to their own preferences.
  'payload-preferences': { create: isStaff },
  // No REST or GraphQL endpoints; only migrations (with access overridden) touch it.
  'payload-migrations': { create: denyAll, read: denyAll, update: denyAll, delete: denyAll },
}

/** Every Payload collection also gets `unlock` denied unless it is an auth collection with its own rule. */
export function hardenPayloadInternals(config: SanitizedConfig): SanitizedConfig {
  for (const collection of config.collections) {
    const override = OVERRIDES[collection.slug]
    if (override) collection.access = { ...collection.access, ...override }
    if (!collection.auth) collection.access.unlock = denyAll
  }
  return config
}
