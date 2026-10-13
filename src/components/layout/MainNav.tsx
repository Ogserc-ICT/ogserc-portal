'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import type { MenuEntry, ResolvedLink } from '@/lib/navigation'

/**
 * The seven-item main menu (SRS Section 4), using the WAI-ARIA disclosure pattern: each dropdown is
 * a button with aria-expanded that shows or hides a list of ordinary links. Desktop (lg and up)
 * shows a menu bar with dropdowns; smaller screens show a Menu button that expands the same items.
 */
export function MainNav({ entries }: { entries: MenuEntry[] }) {
  return (
    <nav aria-label="Main" className="on-dark bg-green-700 text-white">
      <DesktopMenu entries={entries} />
      <MobileMenu entries={entries} />
    </nav>
  )
}

const barItem =
  'inline-flex min-h-12 items-center gap-1 px-2 text-center leading-tight font-semibold hover:bg-green-900 xl:px-4'

function DesktopMenu({ entries }: { entries: MenuEntry[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Close the open dropdown when the user clicks anywhere outside the menu bar.
  useEffect(() => {
    if (!openId) return
    const onPointerDown = (event: PointerEvent) => {
      if (!listRef.current?.contains(event.target as Node)) setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openId])

  return (
    <ul
      ref={listRef}
      className="mx-auto hidden max-w-7xl items-stretch justify-between px-2 lg:flex xl:px-6"
    >
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
            setOpen={(open) => setOpenId(open ? entry.id : null)}
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
  setOpen: (open: boolean) => void
}

function DesktopGroup({ entry, alignRight, open, setOpen }: GroupProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = `menu-${entry.id}`
  const wide = entry.links.length > 6

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  // Close when keyboard focus moves out of this dropdown.
  const onBlur = (event: FocusEvent<HTMLLIElement>) => {
    if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }

  return (
    <li className="relative min-w-0" onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
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
            <PanelLink link={link} onNavigate={() => setOpen(false)} />
          </li>
        ))}
      </ul>
    </li>
  )
}

/**
 * When a label wraps onto two lines (narrow desktop widths or a wide fallback font, D-032), the
 * chevron follows the last word inline instead of sitting apart from the text.
 */
function LabelWithChevron({ label, open }: { label: string; open: boolean }) {
  const words = label.split(' ')
  const last = words.pop()
  return (
    <span>
      {words.length ? `${words.join(' ')} ` : null}
      <span className="whitespace-nowrap">
        {last}
        <Icon
          name="chevronDown"
          className={`ml-1 inline-block size-4 align-[-0.15em] transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </span>
    </span>
  )
}

function PanelLink({ link, onNavigate }: { link: ResolvedLink; onNavigate: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className="flex min-h-11 items-center rounded-md px-3 py-2 hover:bg-green-50 hover:text-green-900"
    >
      {link.label}
    </Link>
  )
}

function MobileMenu({ entries }: { entries: MenuEntry[] }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    setExpanded(null)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      close()
      buttonRef.current?.focus()
    }
  }

  return (
    <div className="lg:hidden" onKeyDown={onKeyDown}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => (open ? close() : setOpen(true))}
          className="inline-flex min-h-12 items-center gap-2 font-semibold"
        >
          <Icon name={open ? 'close' : 'menu'} className="size-6" />
          Menu
        </button>
      </div>
      <ul
        id="mobile-menu"
        hidden={!open}
        className="on-light border-t-4 border-gold-400 bg-white text-ink"
      >
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
              <MobileGroup
                entry={entry}
                open={expanded === entry.id}
                onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                onNavigate={close}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

type MobileGroupProps = {
  entry: Extract<MenuEntry, { kind: 'group' }>
  open: boolean
  onToggle: () => void
  onNavigate: () => void
}

function MobileGroup({ entry, open, onToggle, onNavigate }: MobileGroupProps) {
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
          className={`size-5 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
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
