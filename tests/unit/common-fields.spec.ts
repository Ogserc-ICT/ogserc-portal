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
  const { validateMapEmbed } = await import('../../src/globals/SiteSettings')
  const { validateSiteLink } = await import('../../src/fields/common')
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

test('rich text counts as written only with words or a block in it', async () => {
  const { hasRichText, requiredUnlessLink } = await import('../../src/fields/common')
  const para = (text: string) => ({ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] } })
  expect(hasRichText(para('Hello'))).toBe(true)
  expect(hasRichText(para('   '))).toBe(false)
  expect(hasRichText({ root: { children: [{ type: 'block', fields: {} }] } })).toBe(true)
  expect(hasRichText(null)).toBe(false)
  expect(requiredUnlessLink(para(''), { siblingData: { link: '/regulatory-instruments/forms' } })).toBe(true)
  expect(requiredUnlessLink(para(''), { siblingData: {} })).not.toBe(true)
  expect(requiredUnlessLink(para('Text'), { siblingData: {} })).toBe(true)
})
