import { expect, test } from '@playwright/test'

import { canRemoveAdministrator, leavesNoAdministrator } from '../../src/lib/auth/last-administrator'

// The last-administrator rule (Step 3 plan, D-052). The database tests run it for real, including
// concurrent requests and bulk operations (tests/e2e-db/last-admin.spec.ts).

test.describe('which operations can remove the administrator role', () => {
  test('any delete', () => {
    expect(canRemoveAdministrator('delete', undefined)).toBe(true)
  })

  test('an update that sets roles without administrator', () => {
    expect(canRemoveAdministrator('update', { roles: ['editor'] })).toBe(true)
    expect(canRemoveAdministrator('update', { roles: [] })).toBe(true)
  })

  test('not an update that keeps administrator or leaves roles alone, and not other operations', () => {
    expect(canRemoveAdministrator('update', { roles: ['administrator', 'editor'] })).toBe(false)
    expect(canRemoveAdministrator('update', { name: 'x' })).toBe(false)
    expect(canRemoveAdministrator('update', undefined)).toBe(false)
    for (const operation of ['create', 'read', 'login', 'refresh']) {
      expect(canRemoveAdministrator(operation, { roles: ['editor'] }), operation).toBe(false)
    }
  })
})

test.describe('whether an operation would leave no administrator', () => {
  const administrators = [1, 2, 3]

  test('removing some administrators is fine', () => {
    expect(leavesNoAdministrator({ administrators, targets: [2, 3] })).toBe(false)
    expect(leavesNoAdministrator({ administrators, targets: [1, 2, 99] })).toBe(false)
  })

  test('removing every administrator in one operation is refused, whatever else it matches', () => {
    expect(leavesNoAdministrator({ administrators, targets: [1, 2, 3] })).toBe(true)
    expect(leavesNoAdministrator({ administrators, targets: [3, 2, 1, 7, 8] })).toBe(true)
    expect(leavesNoAdministrator({ administrators: [5], targets: [5] })).toBe(true)
  })

  test('the caller is not counted as removed when the operation cannot change them', () => {
    expect(leavesNoAdministrator({ administrators, targets: [1, 2, 3], keeps: 1 })).toBe(false)
    expect(leavesNoAdministrator({ administrators: [5], targets: [5], keeps: 5 })).toBe(false)
    // ...but a caller who is not an administrator keeps nobody.
    expect(leavesNoAdministrator({ administrators, targets: [1, 2, 3], keeps: 9 })).toBe(true)
  })

  test('ids are compared as text, as Payload passes them in different forms', () => {
    expect(leavesNoAdministrator({ administrators: [1, 2], targets: ['1', '2'] })).toBe(true)
    expect(leavesNoAdministrator({ administrators: [1, 2], targets: ['1', '2'], keeps: '2' })).toBe(false)
  })

  test('an operation matching no administrator is fine, even with none left', () => {
    expect(leavesNoAdministrator({ administrators, targets: [] })).toBe(false)
    expect(leavesNoAdministrator({ administrators, targets: [7, 8] })).toBe(false)
    expect(leavesNoAdministrator({ administrators: [], targets: [7] })).toBe(false)
  })
})
