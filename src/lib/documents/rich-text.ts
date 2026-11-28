import type { DocumentBlock } from './types'

// A document's full text from the CMS (rich text, D-102) as the blocks DocumentText draws, so the
// page keeps its look and its anchors (#part-iii, #paragraph-10). Text is shown as plain words:
// bold opening words, italic reference lines and indented items are kept; links and other
// formatting inside a paragraph are not, as an issued document is reproduced as written.

type Node = {
  type?: string
  tag?: string
  text?: string
  format?: number | string
  indent?: number
  children?: Node[]
  fields?: Record<string, unknown>
}

const BOLD = 1
const ITALIC = 2

const textRuns = (node: Node): Node[] =>
  node.type === 'text' ? [node] : (node.children ?? []).flatMap(textRuns)

const plain = (node: Node): string =>
  node.type === 'text' ? (node.text ?? '') : node.type === 'linebreak' ? '\n' : (node.children ?? []).map(plain).join('')

const hasFormat = (node: Node, flag: number) => typeof node.format === 'number' && (node.format & flag) !== 0

function paragraph(node: Node): DocumentBlock | undefined {
  const text = plain(node)
  if (!text.trim()) return undefined
  const runs = textRuns(node).filter((run) => run.text)
  const note = runs.length > 0 && runs.every((run) => hasFormat(run, ITALIC))
  const first = runs[0]
  const lead = !note && first && hasFormat(first, BOLD) && first.text !== text ? first.text : undefined
  return {
    type: 'paragraph',
    text,
    ...((node.indent ?? 0) > 0 ? { indent: true } : {}),
    ...(lead ? { lead } : {}),
    ...(note ? { note: true } : {}),
  }
}

type Rows = { cells?: { text?: string | null }[] | null }[] | null
type People = { name?: string; role?: string; organisation?: string | null }[] | null

function fromBlock(fields: Record<string, unknown>): DocumentBlock | undefined {
  if (fields.blockType === 'documentTable') {
    const head = ((fields.columns ?? []) as { heading?: string }[]).map((column) => column.heading ?? '')
    const rows = ((fields.rows ?? []) as NonNullable<Rows>).map((row) => (row.cells ?? []).map((cell) => cell.text ?? ''))
    const caption = typeof fields.caption === 'string' && fields.caption ? fields.caption : undefined
    return { type: 'table', ...(caption ? { caption } : {}), head, rows }
  }
  if (fields.blockType === 'signatories') {
    const people = ((fields.people ?? []) as NonNullable<People>).map((person) => ({
      name: person.name ?? '',
      role: person.role ?? '',
      organisation: person.organisation ?? '',
    }))
    return { type: 'signatories', people }
  }
  return undefined
}

function toBlock(node: Node): DocumentBlock | undefined {
  switch (node.type) {
    case 'heading': {
      const text = plain(node)
      if (!text.trim()) return undefined
      return { type: 'heading', level: node.tag === 'h1' || node.tag === 'h2' ? 2 : 3, text }
    }
    case 'paragraph':
    case 'quote':
      return paragraph(node)
    case 'list': {
      const items = (node.children ?? []).map(plain).filter((item) => item.trim())
      return items.length ? { type: 'list', items } : undefined
    }
    case 'block':
      return node.fields ? fromBlock(node.fields) : undefined
    default:
      return undefined
  }
}

/** The full text as blocks, or undefined if there is none. */
export function documentBlocks(data: unknown): DocumentBlock[] | undefined {
  const children = (data as { root?: Node } | null | undefined)?.root?.children ?? []
  const blocks = children.flatMap((node) => {
    const block = toBlock(node)
    return block ? [block] : []
  })
  return blocks.length ? blocks : undefined
}
