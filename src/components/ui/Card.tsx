import Image, { type StaticImageData } from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'

type CardProps = {
  title: string
  href: string
  /** Heading level for the title, so cards fit the page outline. */
  headingLevel?: 'h2' | 'h3' | 'h4'
  meta?: ReactNode
  media?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * A content card. The title is the link and its hit area covers the whole card, so each card has
 * one clear link name instead of repeated "Read more" links.
 */
export function Card({
  title,
  href,
  headingLevel: Heading = 'h3',
  meta,
  media,
  children,
  className = '',
}: CardProps) {
  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition duration-200 focus-within:shadow-md hover:shadow-md motion-safe:hover:-translate-y-0.5 ${className}`}
    >
      {media}
      <div className="flex flex-1 flex-col gap-2 p-5">
        {meta ? <div className="text-sm text-ink-muted">{meta}</div> : null}
        <Heading className="text-lg leading-snug font-semibold text-green-900">
          <Link
            href={href}
            className="underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline"
          >
            {title}
          </Link>
        </Heading>
        {children ? <div className="text-ink-muted">{children}</div> : null}
      </div>
    </article>
  )
}

/**
 * A card's photograph, cropped to the placeholder's 16:9 so cards in a row line up. Decorative
 * (empty alt): the card's title already names the story, and the photo sits inside its link area.
 */
export function CardImage({ image }: { image: StaticImageData }) {
  return (
    <Image
      src={image}
      alt=""
      sizes="(min-width: 64rem) 22rem, (min-width: 40rem) 45vw, 90vw"
      className="aspect-video w-full object-cover"
    />
  )
}

/** The item's photograph if it has one, otherwise the branded placeholder. */
export function CardMedia({ image }: { image?: StaticImageData }) {
  return image ? <CardImage image={image} /> : <ImagePlaceholder />
}

/** Branded stand-in for a photo until OGSERC supplies real images. */
export function ImagePlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-video items-center justify-center bg-linear-to-br from-green-700 to-green-900 text-gold-400"
    >
      <Icon name="bolt" className="size-12" fill="currentColor" />
    </div>
  )
}
