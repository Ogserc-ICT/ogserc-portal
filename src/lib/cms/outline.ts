// The section headings of CMS rich text, for an "On this page" list (D-101). Each h2 gets an id
// made from its words, so the list's links and the RichText headings agree without storing ids.

type LexicalNode = { type?: string; tag?: string; text?: string; children?: LexicalNode[] }

export type OutlineEntry = { id: string; text: string }

/** The words in a rich-text node and its children. */
export function plainText(node: LexicalNode): string {
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(plainText).join('')
}

/** A heading's id: lowercase words joined by hyphens, e.g. "How to complain" → "how-to-complain". */
export function headingId(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The top-level h2 headings of rich text, in order. */
export function outlineOf(data: unknown): OutlineEntry[] {
  const root = (data as { root?: LexicalNode } | null | undefined)?.root
  return (root?.children ?? [])
    .filter((node) => node.type === 'heading' && node.tag === 'h2')
    .map((node) => plainText(node))
    .filter((text) => text.trim() !== '')
    .map((text) => ({ id: headingId(text), text }))
}
