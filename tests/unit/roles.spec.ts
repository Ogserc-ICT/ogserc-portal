import { expect, test } from '@playwright/test'

import { hasCapability, hasRole } from '../../src/access/roles'

test.describe('hasCapability', () => {
  const malformed: [string, unknown][] = [
    ['no user (null)', null],
    ['no user (undefined)', undefined],
    ['a user without roles', {}],
    ['roles set to null', { roles: null }],
    ['an empty roles list', { roles: [] }],
    ['only an unknown role', { roles: ['superuser'] }],
    ['roles as a bare string', { roles: 'administrator' }],
    ['roles as an array-like object', { roles: { 0: 'administrator', length: 1 } }],
    ['roles as a number', { roles: 1 }],
    ['a string instead of a user', 'administrator'],
  ]

  for (const [label, user] of malformed) {
    test(`grants nothing for ${label}`, () => {
      expect(hasCapability(user, 'admin:access')).toBe(false)
      expect(hasCapability(user, 'users:manage')).toBe(false)
      expect(hasRole(user, 'administrator')).toBe(false)
    })
  }

  test('ignores unknown roles next to known ones', () => {
    const user = { roles: ['superuser', 'editor'] }
    expect(hasCapability(user, 'content:edit')).toBe(true)
    expect(hasCapability(user, 'content:publish')).toBe(false)
  })

  test('editor drafts content only', () => {
    const editor = { roles: ['editor'] }
    expect(hasCapability(editor, 'admin:access')).toBe(true)
    expect(hasCapability(editor, 'content:edit')).toBe(true)
    expect(hasCapability(editor, 'content:publish')).toBe(false)
    expect(hasCapability(editor, 'users:manage')).toBe(false)
    expect(hasCapability(editor, 'audit:read')).toBe(false)
  })

  test('publisher publishes but does not manage users', () => {
    const publisher = { roles: ['publisher'] }
    expect(hasCapability(publisher, 'content:publish')).toBe(true)
    expect(hasCapability(publisher, 'users:manage')).toBe(false)
    expect(hasCapability(publisher, 'audit:read')).toBe(false)
  })

  test('administrator can do everything', () => {
    const admin = { roles: ['administrator'] }
    for (const capability of [
      'admin:access',
      'content:edit',
      'content:publish',
      'users:manage',
      'audit:read',
      'settings:manage',
    ] as const) {
      expect(hasCapability(admin, capability)).toBe(true)
    }
  })

  test('several roles combine', () => {
    expect(hasCapability({ roles: ['editor', 'publisher'] }, 'content:publish')).toBe(true)
  })
})
