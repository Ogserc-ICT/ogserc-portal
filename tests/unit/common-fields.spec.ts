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
