import { expect, test } from '@playwright/test'

import { s3Settings, S3_VARIABLES } from '../../src/lib/uploads/s3-settings'
import { portalConfig } from '../../src/payload.config'

// Where uploads are stored (D-086): an S3-compatible bucket when all five settings are present,
// otherwise the local folder; the database schema is the same either way.

const all = {
  S3_BUCKET: 'site-files',
  S3_REGION: 'eu-central-003',
  S3_ENDPOINT: 'https://s3.eu-central-003.example.invalid',
  S3_ACCESS_KEY_ID: 'key-id',
  S3_SECRET_ACCESS_KEY: 'not-a-real-key',
}

test('s3Settings: all five, none, or the names of the missing ones (values trimmed)', () => {
  expect(s3Settings({ ...all, S3_BUCKET: ' site-files ' })).toEqual({
    bucket: 'site-files',
    region: 'eu-central-003',
    endpoint: 'https://s3.eu-central-003.example.invalid',
    accessKeyId: 'key-id',
    secretAccessKey: 'not-a-real-key',
  })
  expect(s3Settings({})).toBeUndefined()
  expect(s3Settings({ S3_BUCKET: 'x' })).toEqual({ missing: S3_VARIABLES.filter((name) => name !== 'S3_BUCKET') })
})

test.describe('the Media collection', () => {
  const saved = { ...process.env }
  test.afterEach(() => {
    for (const name of S3_VARIABLES) {
      if (saved[name] === undefined) delete process.env[name]
      else process.env[name] = saved[name]
    }
  })

  /** Media's field names and whether its files go to local disk, for a config built with this environment. */
  async function media(env: Record<string, string>) {
    Object.assign(process.env, env)
    const config = await portalConfig({ withTestCollections: false })
    const collection = config.collections.find((c) => c.slug === 'media')!
    const upload = collection.upload as { disableLocalStorage?: boolean }
    const names = collection.fields.flatMap((field) => ('name' in field ? [field.name] : []))
    return { names, local: !upload.disableLocalStorage }
  }

  test('without S3 settings files stay on local disk; with them they go to the bucket', async () => {
    for (const name of S3_VARIABLES) delete process.env[name]
    expect((await media({})).local).toBe(true)
    expect((await media(all)).local).toBe(false)
  })

  test('has the object key field either way, exactly once, so the schema does not change', async () => {
    for (const name of S3_VARIABLES) delete process.env[name]
    for (const env of [{}, all]) {
      const { names } = await media(env)
      expect(names.filter((name) => name === '_objectKey')).toHaveLength(1)
    }
  })
})
