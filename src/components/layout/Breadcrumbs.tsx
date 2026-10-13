import Link from 'next/link'

type Crumb = { label: string; href?: string }

/** FR-WEB-03 breadcrumbs. The last crumb is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: 'Home', href: '/' }, ...items]
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trail.map((crumb, i) => {
          const isCurrent = i === trail.length - 1
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {i > 0 ? (
                <span aria-hidden="true" className="text-ink-muted">
                  /
                </span>
              ) : null}
              {isCurrent || !crumb.href ? (
                <span aria-current={isCurrent ? 'page' : undefined} className="text-ink-muted">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="text-green-700 underline underline-offset-4">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
