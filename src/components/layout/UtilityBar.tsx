import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { utilityLinks } from '@/lib/navigation'

/**
 * SRS Section 4 utility bar: Contact Us | Licences | FAQs | Search. Desktop only (lg and up);
 * on smaller screens the same links are in the menu drawer (D-036).
 */
export function UtilityBar() {
  return (
    <div className="on-dark hidden bg-green-900 text-white lg:block">
      <Container>
        <nav aria-label="Utility">
          <ul className="flex flex-wrap items-center justify-end gap-x-1 text-sm">
            {utilityLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-10 items-center gap-1.5 px-2 underline-offset-4 hover:underline"
                >
                  {link.label === 'Search' ? <Icon name="search" className="size-4" /> : null}
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </div>
  )
}
