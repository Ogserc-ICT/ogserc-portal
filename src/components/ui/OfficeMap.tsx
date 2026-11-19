'use client'

import { useState, useSyncExternalStore } from 'react'

import { Button, buttonClasses } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

type OfficeMapProps = {
  /** Google Maps embed address, loaded only when the visitor asks for it. */
  embedUrl: string
  /** Google Maps link for the place, which works without JavaScript. */
  linkUrl: string
  /** What the map shows, for the frame's accessible name. */
  place: string
  className?: string
}

const noSubscribe = () => () => {}

/**
 * Click-to-load map (FR-CNT-01, D-058): nothing is fetched from Google until the visitor presses
 * "Show map", which keeps the page light and sends no data to Google unasked. Without JavaScript
 * only the "Open in Google Maps" link shows.
 */
export function OfficeMap({ embedUrl, linkUrl, place, className = '' }: OfficeMapProps) {
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  )
  const [shown, setShown] = useState(false)
  const frame = `overflow-hidden rounded-lg border border-line bg-white ${className}`

  if (shown) {
    return (
      <div className={frame}>
        <iframe
          ref={(el) => el?.focus()}
          src={embedUrl}
          title={`Map: ${place}`}
          className="size-full min-h-72"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className={`${frame} flex flex-col items-center justify-center gap-4 p-6 text-center`}>
      <Icon name="mapPin" className="size-8 text-green-700" />
      <p className="font-semibold text-green-900">{place}</p>
      <p className="max-w-sm text-sm text-ink-muted">
        The map is provided by Google Maps and loads only when you ask for it.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {hydrated ? (
          <Button variant="secondary" onClick={() => setShown(true)}>
            Show map
          </Button>
        ) : null}
        <a href={linkUrl} className={buttonClasses('outline')}>
          Open in Google Maps
        </a>
      </div>
    </div>
  )
}
