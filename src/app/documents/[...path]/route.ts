import { CATEGORY_BASE, findDocument } from '@/lib/documents/store'

// The first documents' PDFs were served from public/documents/ until they moved into the CMS
// (D-102). Links to those addresses were shared, so each one now redirects to its document's
// current file, wherever storage keeps it (and to a replacement file if staff upload one).
// Only these four addresses exist; anything else is a 404.

const OLD_FILES: Record<string, { category: string; slug: string }> = {
  'orders-and-directives/ogserc-ord-2026-001.pdf': { category: 'orders-and-directives', slug: 'ogserc-ord-2026-001' },
  'orders-and-directives/ogserc-ord-2026-002.pdf': { category: 'orders-and-directives', slug: 'ogserc-ord-2026-002' },
  'consultation/ogserc-cp-2026-001.pdf': { category: 'consultation', slug: 'ogserc-cp-2026-001' },
  'consultation/draft-order-state-grid-and-ogem.pdf': { category: 'consultation', slug: 'draft-order-state-grid-and-ogem' },
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const target = OLD_FILES[(await params).path.join('/')]
  const doc = target ? await findDocument(`${CATEGORY_BASE}/${target.category}`, target.slug) : undefined
  if (!doc) return new Response('Not found', { status: 404 })
  // A relative address, so it works behind any proxy or host name.
  return new Response(null, { status: 308, headers: { Location: doc.file.href } })
}
