import { expect, test } from '@playwright/test'

import { asUser, newAccount } from './support/auth'

// Runs on the empty test database (playwright.db.config.ts resets it before the server starts).
// Payload's "create first user" screen posts to /api/users/first-register without signing in, so
// it must work exactly once, even when two requests arrive together.
test.describe.configure({ mode: 'serial' })

test('the database starts with no users', async ({ request }) => {
  const response = await request.get('/api/users/init')
  expect(response.ok()).toBe(true)
  expect(await response.json()).toMatchObject({ initialized: false })
})

test('two simultaneous first-register requests create exactly one administrator', async ({ request }) => {
  const accounts = [newAccount('first-a'), newAccount('first-b')]
  const responses = await Promise.all(
    accounts.map((data) => request.post('/api/users/first-register', { data })),
  )
  const succeeded = responses.filter((response) => response.ok())
  const statuses = responses.map((response) => response.status())

  // Whatever happened, sign in as an account that was created and count the users that exist.
  const created = succeeded[0]
  expect(created, `no request succeeded (statuses ${statuses.join(', ')})`).toBeDefined()
  const { token } = (await created!.json()) as { token: string }
  const list = await request.get('/api/users', { headers: asUser(token) })
  expect(list.ok()).toBe(true)
  const { totalDocs, docs } = (await list.json()) as { totalDocs: number; docs: { roles: string[] }[] }

  const report = `statuses ${statuses.join(', ')}; users afterwards: ${totalDocs}`
  test.info().annotations.push({ type: 'first-register race', description: report })
  console.log(`[first-user] ${report}`)

  expect(succeeded, report).toHaveLength(1)
  expect(totalDocs, report).toBe(1)
  expect(docs[0]?.roles).toEqual(['administrator'])
})

test('first-register is refused once a user exists', async ({ request }) => {
  const response = await request.post('/api/users/first-register', { data: newAccount('first-late') })
  expect(response.status()).toBe(403)
})
