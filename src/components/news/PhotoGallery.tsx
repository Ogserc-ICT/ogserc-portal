'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import type { NewsPhoto } from '@/lib/cms/content'

const controlClasses =
  'inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-green-900/80 text-white hover:bg-green-700'

/**
 * A story's photographs as a grid of thumbnails (D-069). Each thumbnail links to the full-size
 * photo, so without JavaScript it simply opens the image. With JavaScript, the link opens a viewer
 * instead: a native modal <dialog> (as in MobileMenu, D-036) with previous and next buttons, arrow
 * keys, Escape, a close button and a click outside the photo to close. Tab stays inside it, page
 * scrolling is locked, and focus returns to the thumbnail that opened it. Full-size photos load
 * only when shown.
 */
export function PhotoGallery({ photos, title }: { photos: NewsPhoto[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLAnchorElement | null>(null)

  const count = photos.length
  const current = index === null ? null : photos[index]

  const open = (event: MouseEvent<HTMLAnchorElement>, i: number) => {
    // Let modified clicks (new tab, download) do what the browser normally does.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }
    event.preventDefault()
    openerRef.current = event.currentTarget
    setIndex(i)
  }

  const close = () => dialogRef.current?.close()
  const step = (by: number) => setIndex((i) => (i === null ? i : (i + by + count) % count))

  // Runs for every way the dialog closes: Escape, the close button or a click outside the photo.
  const onClose = () => {
    setIndex(null)
    openerRef.current?.focus()
  }

  // Opens after the photo has rendered, so showModal() can focus the close button.
  const isOpen = index !== null
  useEffect(() => {
    const dialog = dialogRef.current
    if (!isOpen || !dialog) return
    if (!dialog.open) dialog.showModal()
    const root = document.documentElement
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = ''
    }
  }, [isOpen])

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowLeft') step(-1)
    else if (event.key === 'ArrowRight') step(1)
    else if (event.key === 'Tab') trapTab(event)
  }

  // The stage around the photo is empty space: a click there closes, like a backdrop click.
  const onStageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) close()
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {photos.map((photo, i) => (
          <li key={photo.full.src}>
            <a
              href={photo.full.src}
              onClick={(event) => open(event, i)}
              aria-haspopup="dialog"
              className="group block overflow-hidden rounded-md bg-green-100"
            >
              <Image
                src={photo.thumb}
                alt={`${photo.alt} (photo ${i + 1} of ${count}, opens larger)`}
                sizes="(min-width: 64rem) 15rem, (min-width: 40rem) 30vw, 45vw"
                className="aspect-4/3 w-full object-cover transition duration-200 group-hover:scale-105 motion-reduce:transition-none"
              />
            </a>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={`Photos: ${title}`}
        className="lightbox on-dark"
        onClose={onClose}
        onKeyDown={onKeyDown}
      >
        {current && index !== null ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 p-2 sm:p-4">
              <p aria-live="polite" className="pl-2 text-sm font-semibold text-green-50">
                Photo {index + 1} of {count}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Close photos"
                className={controlClasses}
              >
                <Icon name="close" className="size-6" />
              </button>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20"
              onClick={onStageClick}
            >
              <Image
                key={current.full.src}
                src={current.full}
                alt={current.alt}
                sizes="100vw"
                className="max-h-full w-auto max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className={`${controlClasses} absolute top-1/2 left-2 -translate-y-1/2 sm:left-4`}
              >
                <Icon name="arrowRight" className="size-6 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className={`${controlClasses} absolute top-1/2 right-2 -translate-y-1/2 sm:right-4`}
              >
                <Icon name="arrowRight" className="size-6" />
              </button>
            </div>

            <div aria-hidden="true" className="h-4 sm:h-8" />
          </div>
        ) : null}
      </dialog>
    </>
  )
}

/** Keeps Tab and Shift+Tab inside the viewer, wrapping at either end. */
function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])'),
  )
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
