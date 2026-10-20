import { expect, test } from '@playwright/test'

import { rolesChanged } from '../../src/lib/auth/revoke-sessions'

// Which changes end an account's sessions (Step 3 plan, D-052). The database test checks real
// sessions (tests/e2e-db/users.spec.ts, "sessions end when roles or the password change").

test('a different set of roles is a change', () => {
  expect(rolesChanged(['editor'], ['publisher'])).toBe(true)
  expect(rolesChanged(['editor'], ['editor', 'publisher'])).toBe(true)
  expect(rolesChanged(['administrator', 'editor'], ['editor'])).toBe(true)
  expect(rolesChanged(['editor'], [])).toBe(true)
  expect(rolesChanged(undefined, ['editor'])).toBe(true)
})

test('the same set, in any order or with repeats, is not a change', () => {
  expect(rolesChanged(['editor'], ['editor'])).toBe(false)
  expect(rolesChanged(['editor', 'publisher'], ['publisher', 'editor'])).toBe(false)
  expect(rolesChanged(['editor', 'editor'], ['editor'])).toBe(false)
  expect(rolesChanged(undefined, undefined)).toBe(false)
  expect(rolesChanged([], undefined)).toBe(false)
})
