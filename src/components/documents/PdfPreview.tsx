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
 * A preview that starts hidden does not load the PDF until it is first shown.
 */
export function PdfPreview({
  href,
  title,
  id = 'pdf-preview',
  initiallyShown = true,
  label,
}: {
  href: string
  title: string
  /** Added to the button's accessible name, to tell apart several previews on one page. */
  label?: string
  /** Must be unique on the page when it shows more than one preview. */
  id?: string
  initiallyShown?: boolean
}) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
  const [shown, setShown] = useState(initiallyShown)
  const [loaded, setLoaded] = useState(initiallyShown)
  if (!wide) return null

  const toggle = () => {
    setShown(!shown)
    setLoaded(true)
  }

  return (
    <div className="border-t border-line">
      <div className="flex justify-end px-4 py-2">
        <button
          type="button"
          aria-expanded={shown}
          aria-controls={id}
          onClick={toggle}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          <Icon name="eye" className="size-4" />
          {shown ? 'Hide preview' : 'Show preview'}
          {label ? <span className="sr-only"> of {label}</span> : null}
        </button>
      </div>
      {/* Kept in the page when hidden, so aria-controls always points at it. */}
      <iframe
        id={id}
        src={loaded ? href : undefined}
        title={`Preview: ${title}`}
        hidden={!shown}
        className="block h-[48rem] w-full border-t border-line bg-green-50"
      />
    </div>
  )
}
