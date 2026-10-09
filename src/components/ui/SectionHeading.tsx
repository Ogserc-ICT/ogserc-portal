import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'

type SectionHeadingProps = {
  id: string
  title: string
  /** Optional "view all" link shown beside the heading. */
  action?: { label: string; href: string }
}

/** Section title with the short gold underline accent used across the site. */
export function SectionHeading({ id, title, action }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h2 id={id} className="text-2xl font-bold text-green-900 sm:text-3xl">
        {title}
        <span aria-hidden="true" className="mt-2 block h-1 w-16 rounded-full bg-gold-400" />
      </h2>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 font-semibold text-green-700 underline-offset-4 hover:underline"
        >
          {action.label}
          <Icon name="arrowRight" className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}
