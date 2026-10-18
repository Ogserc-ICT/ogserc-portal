import type { CollectionConfig } from 'payload'

import type { Env } from '../../lib/env'
import { E2EDrafts } from './E2EDrafts'

/** True only for the exact value `true`; set by the migrate:create and generate:types scripts and by tests. */
export function testCollectionsEnabled(env: Env): boolean {
  return env.E2E_TEST_COLLECTIONS === 'true'
}

/** Collections that exist only for tests. Never registered in production (src/lib/env.ts refuses the flag). */
export const TEST_COLLECTIONS: CollectionConfig[] = [E2EDrafts]
