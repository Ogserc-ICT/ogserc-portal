import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'
import type { ResolvedLink } from '@/lib/navigation'

/**
 * When a label wraps onto two lines (narrow desktop widths or a wide fallback font, D-032), the
 * chevron follows the last word inline instead of sitting apart from the text.
 */
export function LabelWithChevron({ label, open }: { label: string; open: boolean }) {
  const words = label.split(' ')
  const last = words.pop()
  return (
    <span>
      {words.length ? `${words.join(' ')} ` : null}
      <span className="whitespace-nowrap">
        {last}
        <Icon
          name="chevronDown"
          className={`ml-1 inline-block size-4 align-[-0.15em] transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </span>
    </span>
  )
}

export function PanelLink({ link, onNavigate }: { link: ResolvedLink; onNavigate: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className="flex min-h-11 items-center rounded-md px-3 py-2 hover:bg-green-50 hover:text-green-900"
    >
      {link.label}
    </Link>
  )
}
