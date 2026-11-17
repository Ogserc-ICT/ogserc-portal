'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { PanelLink } from '@/components/layout/menu-parts'
import { Icon } from '@/components/ui/Icon'
import type { MenuEntry, ResolvedLink } from '@/lib/navigation'

import './drawer.css'

/**
 * Below lg: a Menu button that opens a drawer from the left holding the six main-menu items and
 * the utility links (D-036). The drawer is a native modal <dialog>: showModal() makes the rest of
 * the page inert, Escape fires the dialog's own cancel event, and the browser's top layer keeps it
 * above everything. This component adds the rest: Tab wraps inside the drawer, a click on the
 * backdrop closes it, page scrolling is locked while it is open, and focus returns to the Menu
 * button on close.
 */
export function MobileMenu({
  entries,
  utility,
}: {
  entries: MenuEntry[]
  utility: ResolvedLink[]
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const show = () => {
    dialogRef.current?.showModal()
    setOpen(true)
  }
  const close = () => dialogRef.current?.close()

  // Runs for every way the dialog closes: Escape, backdrop, close button, a link, or resize.
  const onClose = () => {
    setOpen(false)
    setExpanded(null)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    root.style.overflow = 'hidden'
    // The drawer is hidden from lg up; close it if the window grows past that while it is open,
    // so an invisible modal never leaves the page inert.
    const desktop = window.matchMedia('(min-width: 64rem)')
    const onChange = () => desktop.matches && dialogRef.current?.close()
    desktop.addEventListener('change', onChange)
    return () => {
      root.style.overflow = ''
      desktop.removeEventListener('change', onChange)
    }
  }, [open])

  // A click on the ::backdrop is reported on the <dialog> itself; the panel inside fills the
  // dialog's box, so clicks on the drawer's content never have the dialog as their target.
  const onDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Tab') trapTab(event)
  }

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={show}
        className="inline-flex min-h-12 items-center gap-2 rounded-md px-3 font-semibold text-green-900 hover:bg-green-50"
      >
        <Icon name="menu" className="size-6" />
        Menu
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-labelledby="mobile-menu-title"
        className="drawer on-light"
        onClose={onClose}
        onClick={onDialogClick}
        onKeyDown={onKeyDown}
      >
        <div className="flex min-h-full flex-col bg-white">
          <div className="flex items-center justify-between border-b-4 border-gold-400 py-2 pr-2 pl-4">
            <h2 id="mobile-menu-title" className="text-lg font-bold text-green-900">
              Menu
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="inline-flex size-12 items-center justify-center rounded-md text-green-900 hover:bg-green-50"
            >
              <Icon name="close" className="size-6" />
            </button>
          </div>

          <nav aria-label="Main">
            <ul>
              {entries.map((entry) => (
                <li key={entry.id} className="border-b border-line">
                  {entry.kind === 'link' ? (
                    <Link
                      href={entry.href}
                      onClick={close}
                      className="flex min-h-12 items-center px-4 font-semibold"
                    >
                      {entry.label}
                    </Link>
                  ) : (
                    <DrawerGroup
                      entry={entry}
                      open={expanded === entry.id}
                      onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                      onNavigate={close}
                    />
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Utility" className="mt-auto bg-green-50 px-2 py-3">
            <ul>
              {utility.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="flex min-h-11 items-center gap-2 rounded-md px-2 font-semibold text-green-900 hover:bg-green-100"
                  >
                    {link.label === 'Search' ? <Icon name="search" className="size-5" /> : null}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </dialog>
    </div>
  )
}

/** Keeps Tab and Shift+Tab inside the drawer, wrapping at either end. */
function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
  const focusable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
  ).filter((el) => el.getClientRects().length > 0) // skip links in collapsed sections
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

type DrawerGroupProps = {
  entry: Extract<MenuEntry, { kind: 'group' }>
  open: boolean
  onToggle: () => void
  onNavigate: () => void
}

function DrawerGroup({ entry, open, onToggle, onNavigate }: DrawerGroupProps) {
  const panelId = `mobile-menu-${entry.id}`
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-12 w-full items-center justify-between px-4 text-left font-semibold"
      >
        {entry.label}
        <Icon
          name="chevronDown"
          className={`size-5 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <ul id={panelId} hidden={!open} className="bg-green-50 px-2 pb-2">
        {entry.links.map((link) => (
          <li key={link.label}>
            <PanelLink link={link} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </>
  )
}
