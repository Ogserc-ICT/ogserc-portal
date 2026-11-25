import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'

import { Icon } from '@/components/ui/Icon'
import { safeHref } from '@/lib/safe-href'

// Rich text from the CMS (D-096), drawn with Payload's own converter (no new library) in the site's
// styles. Headings, lists and links look as they did on the hand-built pages; the "key points" block
// is the green box of the NERC story (D-069). A link is kept only if it is a page of this site, an
// https address, or an email or phone link; anything else (for example `javascript:`) shows as text.

const linkClasses = 'font-semibold text-green-700 underline underline-offset-4'

type Highlights = { intro: string; items: { term: string; text: string; id?: string }[] }

function KeyPoints({ intro, items }: Highlights) {
  return (
    <div className="rounded-lg border-l-4 border-gold-400 bg-green-50 p-5 sm:p-6">
      <p className="font-semibold text-green-900">{intro}</p>
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={item.id ?? item.term} className="flex gap-3">
            <Icon name="bolt" className="mt-1.5 size-4 shrink-0 text-green-700" fill="currentColor" />
            <span>
              <strong className="font-semibold text-green-900">{item.term}:</strong> {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  heading: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    if (node.tag === 'h3' || node.tag === 'h4') return <h3 className="text-lg font-bold text-green-900 sm:text-xl">{children}</h3>
    return <h2 className="pt-4 text-xl font-bold text-green-900 first:pt-0 sm:text-2xl">{children}</h2>
  },
  list: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    return node.tag === 'ol' ? (
      <ol className="list-decimal space-y-2 pl-6 marker:text-green-700">{children}</ol>
    ) : (
      <ul className="list-disc space-y-2 pl-6 marker:text-green-700">{children}</ul>
    )
  },
  link: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children })
    const href = safeHref(node.fields.url)
    if (!href) return <>{children}</>
    if (href.startsWith('/')) return <Link href={href} className={linkClasses}>{children}</Link>
    const external = href.startsWith('https:')
    return (
      <a href={href} className={linkClasses} {...(external && node.fields.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    )
  },
  blocks: {
    highlights: ({ node }: { node: { fields: unknown } }) => <KeyPoints {...(node.fields as Highlights)} />,
  },
})

/** CMS rich text, or nothing if it is empty. */
export function RichText({ data, className }: { data: unknown; className?: string }) {
  const state = data as SerializedEditorState | null | undefined
  if (!state?.root?.children?.length) return null
  return <PayloadRichText data={state} converters={converters} className={className} />
}
