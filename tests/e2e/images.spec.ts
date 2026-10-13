import { expect, test } from '@playwright/test'
import sharp from 'sharp'

// D-034: full-size originals are not served, and optimised images carry no metadata.

test('the full-size originals are no longer served', async ({ request }) => {
  for (const path of [
    '/brand/electricity1.jpg',
    '/brand/electricity2.jpg',
    '/brand/electricity3.jpg',
    '/brand/electricity4.jpg',
    "/brand/Nigeria's%20logo.png",
  ]) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
})

test('the published crest file carries no metadata', async ({ request }) => {
  const response = await request.get('/brand/ogun-state-crest.png')
  expect(response.status()).toBe(200)
  const meta = await sharp(await response.body()).metadata()
  expect({ exif: !!meta.exif, xmp: !!meta.xmp, iptc: !!meta.iptc, icc: !!meta.icc }).toEqual({
    exif: false,
    xmp: false,
    iptc: false,
    icc: false,
  })
})
