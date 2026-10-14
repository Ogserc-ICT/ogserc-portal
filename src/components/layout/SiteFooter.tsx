import Link from 'next/link'
import type { CSSProperties } from 'react'

import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { footerQuickLinks, legalLinks } from '@/lib/navigation'
import { contactDetails, footer } from '@/lib/placeholder-content'

import './footer-grid.css'

const footerLink = 'underline-offset-4 hover:underline'

// Gold accent squares, as grid cells (column, row). `wide` ones show from 1024px only.
const accents = [
  { col: 3, row: 4 },
  { col: 9, row: 9 },
  { col: 21, row: 2, wide: true },
  { col: 28, row: 6, wide: true },
]

/** SRS Section 4 footer, with the FR-WEB-06 legal links. */
export function SiteFooter() {
  return (
    <footer className="on-dark relative isolate overflow-hidden bg-green-900 text-green-50">
      <FooterPattern />
      <Container className="grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-bold text-white">
            Ogun State Electricity Regulatory Commission
          </p>
          <p className="mt-3">{footer.summary}</p>
          <p className="mt-6 font-semibold text-white">Follow us</p>
          <p className="mt-1">{footer.social}</p>
        </div>

        <nav aria-labelledby="footer-quick-links">
          <h2 id="footer-quick-links" className="text-lg font-bold text-white">
            Quick links
          </h2>
          <ul className="mt-3 space-y-1">
            {footerQuickLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={`inline-flex min-h-10 items-center ${footerLink}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-lg font-bold text-white">Contact us</h2>
          <address className="mt-3 space-y-3 not-italic">
            <p className="flex gap-3">
              <Icon name="mapPin" className="mt-0.5 size-5 shrink-0 text-gold-400" />
              <span>
                {contactDetails.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </p>
            <p className="flex gap-3">
              <Icon name="mail" className="mt-0.5 size-5 shrink-0 text-gold-400" />
              <span>{contactDetails.email}</span>
            </p>
            <p className="flex gap-3">
              <Icon name="phone" className="mt-0.5 size-5 shrink-0 text-gold-400" />
              <span>{contactDetails.phone}</span>
            </p>
          </address>
        </div>
      </Container>

      <div className="border-t border-green-700">
        <Container className="flex flex-col gap-4 py-6 text-sm lg:flex-row lg:items-center lg:justify-between">
          <p>
            © {new Date().getFullYear()} Ogun State Electricity Regulatory Commission. All rights
            reserved.
          </p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`inline-flex min-h-10 items-center ${footerLink}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {/* Works without JavaScript: #top is the <body>. The floating button enhances it (D-043). */}
          <a
            href="#top"
            className={`inline-flex min-h-10 items-center gap-2 self-start font-semibold lg:self-auto text-white print:hidden ${footerLink}`}
          >
            <Icon name="arrowUp" className="size-4 text-gold-400" />
            Back to top
          </a>
        </Container>
      </div>
    </footer>
  )
}

/** Decorative grid-of-boxes background (FR-WEB-12, D-040): behind all text, ignores the pointer. */
function FooterPattern() {
  return (
    <div aria-hidden="true" className="footer-grid">
      {accents.map(({ col, row, wide }) => (
        <span
          key={`${col}-${row}`}
          className="footer-grid-accent"
          data-wide={wide ? '' : undefined}
          style={{ '--col': col, '--row': row } as CSSProperties}
        />
      ))}
    </div>
  )
}
