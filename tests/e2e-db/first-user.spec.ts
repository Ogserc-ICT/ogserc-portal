import { randomBytes } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { PASSWORD_MESSAGES } from '../../src/lib/auth/password-policy'
import { asUser, newAccount, saveAdminAccount, sessionCookie, signInToken } from './support/auth'

// Runs on the empty test database (playwright.db.config.ts resets it before the server starts).
// Payload's "create first user" screen posts to /api/users/first-register without signing in, so
// it must work exactly once, even when two requests arrive together.
test.describe.configure({ mode: 'serial' })

test('the database starts with no users', async ({ request }) => {
  const response = await request.get('/api/users/init')
  expect(response.ok()).toBe(true)
  expect(await response.json()).toMatchObject({ initialized: false })
})

test('first-register refuses a password that breaks the policy, and creates nobody', async ({ request }) => {
  // The first account is created through the Local API, so the same policy hook applies (D-053).
  for (const [password, message] of [
    [randomBytes(6).toString('hex').slice(0, 11), PASSWORD_MESSAGES.tooShort],
    [`ogserc${randomBytes(8).toString('hex')}`, PASSWORD_MESSAGES.organisation],
  ] as const) {
    const response = await request.post('/api/users/first-register', { data: { ...newAccount('first-weak'), password } })
    const text = await response.text()
    expect(response.status(), text.slice(0, 300)).toBe(400)
    const body = JSON.parse(text) as { errors: { data?: { errors?: { path?: string; message?: string }[] } }[] }
    expect(body.errors[0]?.data?.errors?.[0]).toEqual(expect.objectContaining({ path: 'password', message }))
  }
  const init = await request.get('/api/users/init')
  expect(await init.json()).toMatchObject({ initialized: false })
})

test('two simultaneous first-register requests create exactly one administrator', async ({ request, baseURL }) => {
  const accounts = [newAccount('first-a'), newAccount('first-b')]
  const responses = await Promise.all(
    accounts.map((data) => request.post('/api/users/first-register', { data })),
  )
  const succeeded = responses.filter((response) => response.ok())
  const statuses = responses.map((response) => response.status())

  // Whatever happened, sign in as an account that was created and count the users that exist.
  const created = succeeded[0]
  expect(created, `no request succeeded (statuses ${statuses.join(', ')})`).toBeDefined()
  // First-register signs in through Payload's Local API login, which also drops the token
  // (`removeTokenFromResponses`), so it returns no token and no usable session cookie. The new
  // administrator signs in normally afterwards.
  expect(await created!.json()).not.toHaveProperty('token')
  expect(sessionCookie(created!.headersArray())?.value ?? '').toBe('')
  const submitted = accounts[responses.indexOf(created!)]!
  const token = await signInToken(baseURL!, submitted)
  const list = await request.get('/api/users', { headers: asUser(token) })
  expect(list.ok()).toBe(true)
  const { totalDocs, docs } = (await list.json()) as { totalDocs: number; docs: { roles: string[]; email: string }[] }

  const report = `statuses ${statuses.join(', ')}; users afterwards: ${totalDocs}`
  test.info().annotations.push({ type: 'first-register race', description: report })
  console.log(`[first-user] ${report}`)

  expect(succeeded, report).toHaveLength(1)
  expect(totalDocs, report).toBe(1)
  expect(docs[0]?.roles).toEqual(['administrator'])
  // First-register has no signed-in user, so the email field's admin-only update rule (D-048)
  // must not drop the address: it is stored exactly as submitted (newAccount is lower-case).
  expect(docs[0]?.email).toBe(submitted.email)

  // The run's administrator, for the projects that depend on this one.
  await saveAdminAccount(submitted)
})

test('first-register is refused once a user exists', async ({ request }) => {
  const response = await request.post('/api/users/first-register', { data: newAccount('first-late') })
  expect(response.status()).toBe(403)
})
