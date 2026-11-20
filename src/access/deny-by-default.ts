import type { CollectionConfig, Config, GlobalConfig, Plugin } from 'payload'

import { denyAll } from './index'

// Payload's default for a missing access function is "any logged-in user", which would let any
// staff role (and, later, any public account) through. This plugin, listed last, replaces every
// missing access function with denyAll, so a collection only allows what it states explicitly.
// Payload's own internal collections are added after plugins run and keep their built-in access.

const COLLECTION_OPERATIONS = ['create', 'read', 'update', 'delete', 'readVersions'] as const
const AUTH_OPERATIONS = ['admin', 'unlock'] as const
const GLOBAL_OPERATIONS = ['read', 'update', 'readVersions'] as const

function withDeniedCollectionDefaults(collection: CollectionConfig): CollectionConfig {
  const operations = collection.auth ? [...COLLECTION_OPERATIONS, ...AUTH_OPERATIONS] : COLLECTION_OPERATIONS
  const access = { ...collection.access }
  for (const operation of operations) {
    access[operation] ??= denyAll
  }
  return { ...collection, access }
}

function withDeniedGlobalDefaults(global: GlobalConfig): GlobalConfig {
  const access = { ...global.access }
  for (const operation of GLOBAL_OPERATIONS) {
    access[operation] ??= denyAll
  }
  return { ...global, access }
}

const denyMissingAccess: Plugin = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map(withDeniedCollectionDefaults),
  globals: config.globals?.map(withDeniedGlobalDefaults),
})

// Payload sorts plugins by `order` before running them, so the highest order (not array
// position alone) is what makes this run after every plugin that adds collections.
// One below the two-factor plugin (src/lib/auth/two-factor.ts), which must wrap the access this
// leaves: running after it would see the wrapped functions as present and leave Payload's
// "any logged-in user" default inside them (D-084).
export const denyByDefault: Plugin = Object.assign(denyMissingAccess, { order: Number.MAX_SAFE_INTEGER - 1 })
