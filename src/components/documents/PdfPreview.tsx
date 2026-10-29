'use client'

import { useState, useSyncExternalStore } from 'react'

import { Icon } from '@/components/ui/Icon'

const WIDE = '(min-width: 1024px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Inline preview of a document's PDF (D-060), on screens 1024px and wider only: most phone
 * browsers cannot show a PDF inside a page, and a phone should not download it unasked. Without
 * JavaScript, or on a phone, nothing renders and the Open and Download buttons beside it remain.
 */
export function PdfPreview({ href, title }: { href: string; title: string }) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
  const [shown, setShown] = useState(true)
  if (!wide) return null

  return (
    <div className="border-t border-line">
      <div className="flex justify-end px-4 py-2">
        <button
          type="button"
          aria-expanded={shown}
          aria-controls="pdf-preview"
          onClick={() => setShown(!shown)}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          <Icon name="eye" className="size-4" />
          {shown ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
      {/* Kept in the page when hidden, so aria-controls always points at it. */}
      <iframe
        id="pdf-preview"
        src={href}
        title={`Preview: ${title}`}
        hidden={!shown}
        className="block h-[48rem] w-full border-t border-line bg-green-50"
      />
    </div>
  )
}
