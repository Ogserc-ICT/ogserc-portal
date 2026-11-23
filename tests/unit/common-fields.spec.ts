import { expect, test } from '@playwright/test'

import { validateHttpsUrl } from '../../src/fields/common'

test('links must be full https addresses; empty is allowed', () => {
  for (const ok of [undefined, null, '', 'https://example.org/register', 'https://forms.example.org/a?b=c']) {
    expect(validateHttpsUrl(ok), String(ok)).toBe(true)
  }
  for (const bad of ['http://example.org', 'javascript:alert(1)', 'example.org', '/register', `https://example.org/${'a'.repeat(500)}`, 3]) {
    expect(validateHttpsUrl(bad), String(bad)).not.toBe(true)
  }
})

test('slide and settings links: a page of this site or an https address', async () => {
  const { validateSiteLink, validateMapEmbed } = await import('../../src/globals/SiteSettings')
  for (const ok of ['/about-ogserc', '/regulatory-instruments/forms#reg-01a', 'https://example.org/a']) expect(validateSiteLink(ok), ok).toBe(true)
  for (const bad of ['', '//evil.example', '/About', 'javascript:alert(1)', 'http://example.org', '/a b']) {
    expect(validateSiteLink(bad), bad).not.toBe(true)
  }
  expect(validateMapEmbed('')).toBe(true)
  expect(validateMapEmbed('https://www.google.com/maps/embed?pb=!1m14')).toBe(true)
  for (const bad of ['https://evil.example/maps/embed?', 'http://www.google.com/maps/embed?x', 'https://www.google.com/maps/place/x']) {
    expect(validateMapEmbed(bad), bad).not.toBe(true)
  }
})

test('gallery videos: YouTube or Vimeo over https only', async () => {
  const { validateVideoUrl } = await import('../../src/collections/Galleries')
  for (const ok of ['https://www.youtube.com/watch?v=abc', 'https://youtu.be/abc', 'https://vimeo.com/123']) expect(validateVideoUrl(ok), ok).toBe(true)
  for (const bad of ['', 'http://www.youtube.com/watch?v=abc', 'https://youtube.com.evil.example/x', 'https://example.org/video.mp4', 'nonsense']) {
    expect(validateVideoUrl(bad), bad).not.toBe(true)
  }
})
