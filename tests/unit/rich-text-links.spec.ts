import { expect, test } from '@playwright/test'

import { safeHref } from '../../src/lib/safe-href'

// Links in CMS rich text (D-096) are kept only if they are safe to follow.
test('pages of this site, https, email and phone links are kept', () => {
  for (const ok of ['/regulatory-instruments/forms', '#payment', 'https://example.org/a', 'mailto:registration@ogserc.org.ng', 'tel:+2348137720058']) {
    expect(safeHref(ok), ok).toBe(ok)
  }
})

test('scripts, other schemes and protocol-relative links are dropped', () => {
  for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', 'http://example.org', '//evil.example', 'vbscript:x', '', null, 3]) {
    expect(safeHref(bad), String(bad)).toBeNull()
  }
})
