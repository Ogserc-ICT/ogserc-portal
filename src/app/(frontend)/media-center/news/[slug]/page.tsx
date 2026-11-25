import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageBand } from '@/components/layout/PageBand'
import { PhotoGallery } from '@/components/news/PhotoGallery'
import { buttonClasses } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { Panel } from '@/components/ui/Panel'
import { RichText } from '@/components/content/RichText'
import { findStory, storyPhotos } from '@/lib/cms/content'
import { formatDate } from '@/lib/format-date'
import { routes } from '@/lib/navigation'
import type { News } from '@/payload-types'

type Props = { params: Promise<{ slug: string }> }

// Published stories with a page of their own only (D-096); any other address is a 404.
async function load(params: Props['params']): Promise<News> {
  const story = await findStory((await params).slug)
  if (!story) notFound()
  return story
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await load(params)
  return { title: story.title, description: story.summary }
}

/**
 * A news story's own page (FR-NEWS-01, D-069): the first photograph leads the story, the rest
 * follow it as a gallery.
 */
export default async function NewsArticlePage({ params }: Props) {
  const article = await load(params)
  const photos = storyPhotos(article)
  const [lead, ...gallery] = photos
  const date = article.publishedDate.slice(0, 10)

  return (
    <>
      <PageBand
        breadcrumbs={[
          { label: 'Media Center' },
          { label: routes.news.label, href: routes.news.path },
          { label: article.title },
        ]}
        eyebrow="News"
        titleId="article-title"
        title={article.title}
        long
      >
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-green-50">
          <Icon name="calendar" className="size-4" />
          <time dateTime={date}>{formatDate(date)}</time>
        </p>
      </PageBand>

      <div className="bg-green-50 py-10 sm:py-14">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article
            aria-labelledby="article-title"
            className="min-w-0 overflow-hidden rounded-lg border border-line bg-white"
          >
            {lead ? (
              <Image
                src={lead.full}
                alt={lead.alt}
                priority
                sizes="(min-width: 80rem) 52rem, (min-width: 64rem) 65vw, 100vw"
                className="h-auto w-full"
              />
            ) : null}

            <RichText data={article.body} className="space-y-6 p-5 text-lg leading-relaxed sm:p-8" />

            {gallery.length > 0 ? (
              <section
                id="photos"
                aria-labelledby="photos-heading"
                className="scroll-mt-6 border-t border-line p-5 sm:p-8"
              >
                <h2 id="photos-heading" className="text-xl font-bold text-green-900 sm:text-2xl">
                  Photos
                </h2>
                <div className="mt-5">
                  <PhotoGallery photos={gallery} title={article.title} />
                </div>
              </section>
            ) : null}
          </article>

          <aside aria-label="About this story" className="min-w-0 space-y-6">
            <Panel id="story-details" title="Story details">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Published</dt>
                  <dd className="text-right font-semibold">
                    <time dateTime={date}>{formatDate(date)}</time>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Photos</dt>
                  <dd className="text-right font-semibold">{photos.length}</dd>
                </div>
              </dl>
              {gallery.length > 0 ? (
                <a href="#photos" className={buttonClasses('outline', 'mt-6 w-full')}>
                  <Icon name="eye" className="size-4" />
                  View the photos
                </a>
              ) : null}
              <Link href={routes.news.path} className={buttonClasses('secondary', 'mt-3 w-full')}>
                <Icon name="arrowRight" className="size-4 rotate-180" />
                All news
              </Link>
            </Panel>
          </aside>
        </Container>
      </div>
    </>
  )
}
