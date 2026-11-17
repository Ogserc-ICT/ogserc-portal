'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'

import { LabelWithChevron, PanelLink } from '@/components/layout/menu-parts'
import type { MenuEntry } from '@/lib/navigation'

/**
 * Desktop main menu (lg and up), six items (SRS Section 4, D-075). WAI-ARIA disclosure pattern:
 * each dropdown is a button with aria-expanded that shows or hides a list of ordinary links (D-026).
 *
 * Dropdowns open on click, Enter or Space, and also on mouse hover where the device supports it
 * (D-035). Hover is never the only way. WCAG 1.4.13: the panel is hoverable (it sits inside the
 * item, with no gap), persistent (no timeout while the pointer is over it) and dismissible (Escape
 * closes it, and hover does not reopen it until the pointer has left).
 * Below lg the menu is in the drawer (MobileMenu.tsx).
 */
export function MainNav({ entries }: { entries: MenuEntry[] }) {
  return (
    <nav aria-label="Main" className="on-dark hidden bg-green-700 text-white lg:block">
      <DesktopMenu entries={entries} />
    </nav>
  )
}

const barItem =
  'inline-flex min-h-12 items-center gap-1 px-2 text-center leading-tight font-semibold hover:bg-green-900 xl:px-4'

// How long a hover-opened dropdown stays open after the pointer leaves, so a pointer that slips
// off the edge for a moment does not snap it shut.
const HOVER_CLOSE_DELAY_MS = 300

const supportsHover = (event: PointerEvent) =>
  event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches

function DesktopMenu({ entries }: { entries: MenuEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  // Pinned: opened by click or keyboard, so it stays open when the pointer leaves.
  const [pinned, setPinned] = useState(false)
  // After Escape, hover must not reopen the same dropdown until the pointer leaves it.
  const suppressedId = useRef<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const listRef = useRef<HTMLUListElement>(null)

  const cancelClose = () => clearTimeout(closeTimer.current)
  const close = useCallback(() => {
    clearTimeout(closeTimer.current)
    setOpenId(null)
    setPinned(false)
  }, [])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // While a dropdown is open: a click anywhere outside the menu bar closes it, and so does Escape,
  // even if keyboard focus is elsewhere (a dropdown opened by hover).
  useEffect(() => {
    if (!openId) return
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!listRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const item = listRef.current?.querySelector<HTMLElement>(`[data-menu-id="${openId}"]`)
      suppressedId.current = item?.matches(':hover') ? openId : null
      if (item?.contains(document.activeElement)) item.querySelector('button')?.focus()
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openId, close])

  const hoverOpen = (id: string) => {
    cancelClose()
    if (suppressedId.current === id || openId === id) return
    setOpenId(id)
    setPinned(false)
  }

  const hoverLeave = (id: string) => {
    if (suppressedId.current === id) suppressedId.current = null
    if (pinned || openId !== id) return
    closeTimer.current = setTimeout(() => {
      setOpenId((current) => (current === id ? null : current))
    }, HOVER_CLOSE_DELAY_MS)
  }

  // A click on a dropdown that hover opened keeps it open rather than toggling it shut.
  const toggle = (id: string) => {
    cancelClose()
    suppressedId.current = null
    if (openId === id && pinned) return close()
    setOpenId(id)
    setPinned(true)
  }

  return (
    <ul ref={listRef} className="mx-auto flex max-w-7xl items-stretch justify-between px-2 xl:px-6">
      {entries.map((entry, index) =>
        entry.kind === 'link' ? (
          <li key={entry.id} className="min-w-0">
            <Link href={entry.href} className={barItem}>
              {entry.label}
            </Link>
          </li>
        ) : (
          <DesktopGroup
            key={entry.id}
            entry={entry}
            alignRight={index >= entries.length - 2}
            open={openId === entry.id}
            onToggle={() => toggle(entry.id)}
            onHoverOpen={() => hoverOpen(entry.id)}
            onHoverLeave={() => hoverLeave(entry.id)}
            onClose={close}
          />
        ),
      )}
    </ul>
  )
}

type GroupProps = {
  entry: Extract<MenuEntry, { kind: 'group' }>
  alignRight: boolean
  open: boolean
  onToggle: () => void
  onHoverOpen: () => void
  onHoverLeave: () => void
  onClose: () => void
}

function DesktopGroup({
  entry,
  alignRight,
  open,
  onToggle,
  onHoverOpen,
  onHoverLeave,
  onClose,
}: GroupProps) {
  const panelId = `menu-${entry.id}`
  const wide = entry.links.length > 6

  // Close when keyboard focus moves out of this dropdown.
  const onBlur = (event: FocusEvent<HTMLLIElement>) => {
    if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) onClose()
  }

  return (
    <li
      data-menu-id={entry.id}
      className="relative min-w-0"
      onBlur={onBlur}
      onPointerEnter={(event) => supportsHover(event) && onHoverOpen()}
      onPointerLeave={(event) => supportsHover(event) && onHoverLeave()}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={`${barItem} ${open ? 'bg-green-900' : ''}`}
      >
        <LabelWithChevron label={entry.label} open={open} />
      </button>
      <ul
        id={panelId}
        hidden={!open}
        className={`on-light absolute top-full z-40 rounded-b-lg border-t-4 border-gold-400 bg-white p-2 text-ink shadow-lg ${
          alignRight ? 'right-0' : 'left-0'
        } ${wide ? 'grid w-md grid-flow-col grid-rows-6 gap-x-2' : 'w-64'}`}
      >
        {entry.links.map((link) => (
          <li key={link.label}>
            <PanelLink link={link} onNavigate={onClose} />
          </li>
        ))}
      </ul>
    </li>
  )
}
