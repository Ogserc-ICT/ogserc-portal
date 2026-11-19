import { expect, test } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { APIError, ValidationError } from 'payload'

import {
  BULK_PASSWORD_MESSAGE,
  enforcePasswordPolicy,
  PASSWORD_CHECK_UNAVAILABLE,
  passwordPolicyOnSave,
  refuseBulkPasswordChange,
} from '../../src/lib/auth/enforce-password-policy'
import { PASSWORD_MESSAGES } from '../../src/lib/auth/password-policy'

// The policy hook on the staff collection, with fake requests (D-053). The database tests check the
// same paths through Payload itself (tests/e2e-db/password-policy.spec.ts).

// The hooks use the real breach check; keep them offline. The breach tests below pass a fake.
process.env.PASSWORD_BREACH_CHECK = 'off'

type HookArgs = Parameters<typeof passwordPolicyOnSave>[0]

const strong = () => randomBytes(12).toString('hex')

function fakeReq() {
  const errors: unknown[] = []
  return { req: { payload: { logger: { error: (message: unknown) => errors.push(message) } } }, errors }
}

function save(operation: 'create' | 'update', data: Record<string, unknown>, originalDoc?: Record<string, unknown>) {
  const { req } = fakeReq()
  return passwordPolicyOnSave({
    collection: { slug: 'users' },
    context: {},
    data,
    operation,
    originalDoc,
    req,
  } as unknown as HookArgs)
}

async function refusal(promise: Promise<unknown>): Promise<{ status: number; path?: string; message?: string }> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    const { status, data } = error as ValidationError
    return { status, path: data.errors[0]?.path, message: data.errors[0]?.message }
  }
  throw new Error('expected the password to be refused')
}

test('create: a weak password is refused on the password path with 400', async () => {
  expect(await refusal(save('create', { email: 'a.person@example.org', password: strong().slice(0, 11) }))).toEqual({
    status: 400,
    path: 'password',
    message: PASSWORD_MESSAGES.tooShort,
  })
})

test('create: a missing password is refused', async () => {
  expect((await refusal(save('create', { email: 'a.person@example.org' }))).message).toBe(PASSWORD_MESSAGES.missing)
})

test('create: a compliant password passes and the data is returned unchanged', async () => {
  const data = { email: 'a.person@example.org', password: strong() }
  expect(await save('create', data)).toBe(data)
})

test('update without a password is not checked', async () => {
  for (const data of [{ name: 'x' }, { password: '' }, { password: null }, { password: undefined }]) {
    expect(await save('update', data, { email: 'a.person@example.org' })).toBe(data)
  }
})

test('update: a weak password is refused', async () => {
  const result = await refusal(save('update', { password: `ogserc${strong()}` }, { email: 'a.person@example.org' }))
  expect(result.message).toBe(PASSWORD_MESSAGES.organisation)
})

test('update: a non-string password is refused, not silently ignored', async () => {
  expect((await refusal(save('update', { password: 123456789012345 }, {}))).message).toBe(PASSWORD_MESSAGES.missing)
})

test('update: both the stored and the submitted email are checked', async () => {
  const stored = { email: 'kemi.bello@example.org' }
  // The submitted email may be dropped later by field access, so the stored one still counts.
  const keepsStored = await refusal(save('update', { email: 'other.name@example.org', password: `${strong()}Bello` }, stored))
  expect(keepsStored.message).toBe(PASSWORD_MESSAGES.email)
  const usesNew = await refusal(save('update', { email: 'tunde.ade@example.org', password: `Tunde${strong()}` }, stored))
  expect(usesNew.message).toBe(PASSWORD_MESSAGES.email)
})

test('a missing common-passwords list refuses with 500 and one fixed log line, never skips', async () => {
  const { req, errors } = fakeReq()
  const check = enforcePasswordPolicy(
    { password: strong(), emails: [], collection: 'users', req: req as never },
    {
      readList: () => {
        throw new Error('ENOENT')
      },
    },
  )
  await expect(check).rejects.toBeInstanceOf(APIError)
  await check.catch((error: APIError) => {
    expect(error.status).toBe(500)
    expect(error.message).toBe(PASSWORD_CHECK_UNAVAILABLE)
    expect(error.isPublic).toBe(true)
  })
  expect(errors).toEqual(['Common-passwords list could not be read; password refused (data/common-passwords).'])
})

test.describe('bulk updates', () => {
  type OperationArgs = Parameters<typeof refuseBulkPasswordChange>[0]
  const run = (args: Record<string, unknown>, operation = 'update') =>
    refuseBulkPasswordChange({ args, collection: { slug: 'users' }, operation, req: {} } as unknown as OperationArgs)

  test('an update by query that sets a password is refused whole, whatever the password', () => {
    for (const password of [strong(), 'x']) {
      expect(() => run({ where: { roles: { in: ['editor'] } }, data: { password } })).toThrow(ValidationError)
    }
    let error: unknown
    try {
      run({ where: {}, data: { password: strong() } })
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).status).toBe(400)
    expect((error as ValidationError).data.errors[0]).toEqual({ message: BULK_PASSWORD_MESSAGE, path: 'password' })
  })

  test('other updates pass through unchanged', () => {
    const byId = { id: 3, data: { password: strong() } }
    expect(run(byId)).toBe(byId)
    const bulkWithoutPassword = { where: {}, data: { name: 'x' } }
    expect(run(bulkWithoutPassword)).toBe(bulkWithoutPassword)
    const create = { data: { password: strong() } }
    expect(run(create, 'create')).toBe(create)
  })
})
