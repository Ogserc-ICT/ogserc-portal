import { timingSafeEqual } from 'crypto'

import type { PayloadRequest } from 'payload'

import { userCan } from '../../access'
import { MIN_JOBS_SECRET_LENGTH } from '../env'

// Who may start Payload's job runner (`GET /api/payload-jobs/run`), which carries out scheduled
// publishing (FR-CMS-04, D-090). Payload's default lets any signed-in user run, queue or cancel jobs.
// Here only the server's cron job may run them, by sending JOBS_RUN_SECRET (deploy/run-jobs.sh);
// nobody may queue a job through the API (the admin panel's scheduling screen queues them itself,
// after checking that the person may publish), and only administrators may cancel one.

/** True if the request carries `Authorization: Bearer <JOBS_RUN_SECRET>`, compared in constant time. */
export function hasJobsSecret(req: Pick<PayloadRequest, 'headers'>, value = process.env.JOBS_RUN_SECRET): boolean {
  const secret = value?.trim()
  if (!secret || secret.length < MIN_JOBS_SECRET_LENGTH) return false
  const header = req.headers?.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export const jobsAccess = {
  run: ({ req }: { req: PayloadRequest }) => hasJobsSecret(req),
  queue: () => false,
  cancel: ({ req }: { req: PayloadRequest }) => userCan(req.user, 'users:manage'),
}
