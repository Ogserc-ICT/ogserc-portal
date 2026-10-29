import type { ReactNode } from 'react'

/** A white card with a titled header, for page sidebars (contact page, document pages). */
export function Panel({
  id,
  title,
  children,
}: {
  id: string
  title: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-line bg-white p-6">
      <h2 id={id} className="border-b border-line pb-4 text-lg font-bold text-green-900">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}
