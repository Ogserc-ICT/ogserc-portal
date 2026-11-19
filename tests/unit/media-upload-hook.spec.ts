import { expect, test } from '@playwright/test'
import { ValidationError } from 'payload'

import { acceptOnlyRealImages } from '../../src/collections/Media'

// The Media upload hook tells staff which rule failed, and only them (D-045). Anyone who may not
// make the upload is left to the access check's generic 403, which Payload runs after this hook.

const HTML = new TextEncoder().encode('<!doctype html><script>alert(1)</script>')
const staff = (...roles: string[]) => ({ collection: 'users', roles })

type HookArgs = Parameters<typeof acceptOnlyRealImages>[0]

function run(operation: 'create' | 'update', user: unknown, overrideAccess = false) {
  const req = { user, file: { data: HTML, mimetype: 'image/png', name: 'page.png', size: HTML.length } }
  const args = { overrideAccess, req }
  return () => acceptOnlyRealImages({ args, operation, req, collection: {}, context: {} } as unknown as HookArgs)
}

function ruleMessage(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    return (error as ValidationError).data.errors[0]!.message
  }
  throw new Error('expected the upload to be rejected')
}

test('tells an editor creating an image which rule failed', () => {
  expect(ruleMessage(run('create', staff('editor')))).toMatch(/^Only JPEG, PNG, WebP and AVIF images are accepted/)
})

test('tells a publisher replacing an image which rule failed', () => {
  expect(ruleMessage(run('update', staff('publisher')))).toMatch(/^Only JPEG/)
})

test('says nothing to someone signed out; the access check refuses them', () => {
  expect(run('create', null)).not.toThrow()
  expect(run('update', undefined)).not.toThrow()
})

test('says nothing to an editor replacing an image, or to a user with no roles', () => {
  expect(run('update', staff('editor'))).not.toThrow()
  expect(run('create', staff())).not.toThrow()
  expect(run('create', { collection: 'other', roles: ['administrator'] })).not.toThrow()
})

test('still checks files from trusted server code that overrides access', () => {
  expect(ruleMessage(run('create', null, true))).toMatch(/^Only JPEG/)
})
