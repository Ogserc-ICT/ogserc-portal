import type { DocumentBlock } from '@/lib/documents/types'

// The full text of a document (D-060). Its own headings sit under the page's "Full text" heading,
// so PART and SCHEDULE headings are h3 and numbered paragraphs h4. Each gets an anchor
// (#part-iii, #paragraph-10, #schedule-3), so a clause can be linked to directly.

function anchorFor(text: string): string | undefined {
  const part = /^PART ([IVX]+)\b/.exec(text)
  if (part) return `part-${part[1].toLowerCase()}`
  const schedule = /^Schedule (\d+)\b/.exec(text)
  if (schedule) return `schedule-${schedule[1]}`
  const paragraph = /^(\d+)\. /.exec(text)
  if (paragraph) return `paragraph-${paragraph[1]}`
  return undefined
}

function Paragraph({ block }: { block: Extract<DocumentBlock, { type: 'paragraph' }> }) {
  const lead = block.lead && block.text.startsWith(block.lead) ? block.lead : undefined
  const className = block.note
    ? 'text-sm text-ink-muted italic'
    : block.indent
      ? 'pl-6 sm:pl-10'
      : undefined
  return (
    <p className={className}>
      {lead ? (
        <>
          <strong>{lead}</strong>
          {block.text.slice(lead.length)}
        </>
      ) : (
        block.text
      )}
    </p>
  )
}

function Table({ block }: { block: Extract<DocumentBlock, { type: 'table' }> }) {
  const name = block.caption ?? block.head.join(', ')
  return (
    // Scrolls sideways on narrow screens; focusable so keyboard users can scroll it too.
    <div
      role="region"
      aria-label={name}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-line"
    >
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        {block.caption ? (
          <caption className="bg-green-50 px-4 py-3 text-left font-semibold text-green-900">
            {block.caption}
          </caption>
        ) : null}
        <thead className="bg-green-50">
          <tr>
            {block.head.map((cell) => (
              <th key={cell} scope="col" className="border-t border-line px-4 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join('|')} className="border-t border-line align-top">
              {row.map((cell, i) => (
                <td key={i} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Block({ block }: { block: DocumentBlock }) {
  switch (block.type) {
    case 'heading': {
      const id = anchorFor(block.text)
      return block.level === 2 ? (
        <h3 id={id} className="scroll-mt-6 pt-6 text-lg font-bold text-green-900">
          {block.text}
        </h3>
      ) : (
        <h4 id={id} className="scroll-mt-6 pt-2 font-bold text-green-900">
          {block.text}
        </h4>
      )
    }
    case 'paragraph':
      return <Paragraph block={block} />
    case 'list':
      return (
        <ul className="list-disc space-y-2 pl-10">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'table':
      return <Table block={block} />
    case 'signatories':
      return (
        <div className="grid gap-6 pt-2 sm:grid-cols-2">
          {block.people.map((person) => (
            <p key={person.name}>
              <span className="block font-semibold">{person.name}</span>
              <span className="block text-sm">{person.role}</span>
              <span className="block text-sm text-ink-muted">{person.organisation}</span>
            </p>
          ))}
        </div>
      )
  }
}

/** Jump links to each PART and SCHEDULE, so the long text is easy to move around on a phone. */
function Contents({ blocks }: { blocks: DocumentBlock[] }) {
  const entries = blocks.flatMap((block) => {
    if (block.type !== 'heading' || block.level !== 2) return []
    const id = anchorFor(block.text)
    return id ? [{ id, text: block.text }] : []
  })
  if (entries.length < 2) return null
  return (
    <nav aria-labelledby="document-contents" className="mb-8 rounded-lg bg-green-50 p-4 sm:p-5">
      <h3 id="document-contents" className="font-bold text-green-900">
        Contents
      </h3>
      <ol className="mt-2 space-y-1">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="inline-flex min-h-10 items-center text-sm text-green-700 underline underline-offset-4"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function DocumentText({ blocks }: { blocks: DocumentBlock[] }) {
  return (
    <div className="space-y-4 leading-relaxed">
      <Contents blocks={blocks} />
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
}
