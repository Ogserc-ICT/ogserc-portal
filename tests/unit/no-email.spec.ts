import { expect, test } from '@playwright/test'
import { APIError } from 'payload'

import { FORGOT_PASSWORD_OFF, publicErrorReply, refuseForgotPassword } from '../../src/lib/auth/no-forgot-password'
import { EMAIL_OFF_LOG, noSendEmail } from '../../src/lib/email/no-send'
import configPromise from '../../src/payload.config'

// No email (D-085): the adapter sends nothing and logs no message content; forgotten-password
// requests over the API are refused with one fixed reply. The database tests check the refusal
// through Payload (tests/e2e-db/rate-limits.spec.ts).

test('the email adapter sends nothing and logs one fixed line without the message', async () => {
  const lines: unknown[] = []
  const adapter = noSendEmail({ payload: { logger: { warn: (line: unknown) => lines.push(line) } } as never })
  const message = { to: 'kemi@example.org', subject: 'Reset', html: '<a href="https://example.org/admin/reset/SECRET-TOKEN">' }
  await expect(adapter.sendEmail(message)).resolves.toBeUndefined()
  expect(lines).toEqual([EMAIL_OFF_LOG])
  expect(JSON.stringify(lines)).not.toMatch(/SECRET-TOKEN|kemi@example.org|Reset/)
})

test('the deployed config uses it', async () => {
  const config = await configPromise
  const adapter = await config.email
  expect(adapter).toBe(noSendEmail)
})

test.describe('forgotten passwords', () => {
  const run = (operation: string, payloadAPI: string) =>
    refuseForgotPassword({ args: { data: { email: 'a@example.org' } }, operation, req: { payloadAPI } } as never)

  test('a request over the API is refused with 403 and the fixed message', async () => {
    let caught: unknown
    try {
      await run('forgotPassword', 'REST')
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(APIError)
    expect((caught as APIError).status).toBe(403)
    expect((caught as APIError).message).toBe(FORGOT_PASSWORD_OFF)
    expect(publicErrorReply({ error: caught } as never)).toEqual({ response: { errors: [{ message: FORGOT_PASSWORD_OFF }] }, status: 403 })
  })

  test('trusted server code and other operations are left alone', async () => {
    expect(await run('forgotPassword', 'local')).toEqual({ data: { email: 'a@example.org' } })
    expect(await run('login', 'REST')).toEqual({ data: { email: 'a@example.org' } })
  })

  test('the reply hook ignores errors that are not marked for the visitor', () => {
    expect(publicErrorReply({ error: new APIError('internal detail', 403, undefined, true) } as never)).toBeUndefined()
    expect(publicErrorReply({ error: { status: 403, message: 'x' } } as never)).toBeUndefined()
  })
})
