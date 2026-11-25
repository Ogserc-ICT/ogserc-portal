import { expect, test } from '@playwright/test'

import { mediaPath } from '../../src/lib/media-path'

// Uploaded images are given to next/image by their site-relative address, which next.config.ts
// allows; Payload's full URL (with SITE_URL as serverURL) would be refused and break the page (D-096).
test('full and relative addresses of uploads become site-relative', () => {
  expect(mediaPath('https://ogserc.org.ng/api/media/file/hero-1.jpg')).toBe('/api/media/file/hero-1.jpg')
  expect(mediaPath('http://localhost:3100/api/media/file/a-640x360.jpg?2')).toBe('/api/media/file/a-640x360.jpg?2')
  expect(mediaPath('/api/media/file/hero-1.jpg')).toBe('/api/media/file/hero-1.jpg')
})

test('anything that is not an upload is refused', () => {
  for (const bad of [undefined, null, '', '/etc/passwd', 'https://evil.example/x.jpg', 'not a url']) expect(mediaPath(bad), String(bad)).toBeUndefined()
})
