import type { CollectionConfig } from 'payload'

import { denyAll } from '../access'

// Counters for sign-in rate limiting (Step 3 plan commit 4, D-081). Written and read only by
// src/lib/auth/rate-limit.ts, with parameterised SQL outside the request's transaction. Nobody,
// staff included, can read or change it through Payload. Keys are HMACs: no address or email is
// stored in readable form.
export const RateLimits: CollectionConfig = {
  slug: 'rate-limits',
  admin: { hidden: true },
  access: {
    create: denyAll,
    read: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  timestamps: false,
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'count', type: 'number', required: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
