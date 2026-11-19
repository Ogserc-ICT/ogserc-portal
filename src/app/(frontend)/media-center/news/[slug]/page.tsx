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
import { formatDate } from '@/lib/format-date'
import { routes } from '@/lib/navigation'
import {
  type NewsArticle,
  type StoryBlock,
  findArticle,
  newsArticles,
} from '@/lib/news/news-articles'

type Props = { params: Promise<{ slug: string }> }

// Only the stories in the list exist; any other address is a 404.
export const dynamicParams = false

export function generateStaticParams() {
  return newsArticles.map((article) => ({ slug: article.slug }))
}

async function load(params: Props['params']): Promise<NewsArticle> {
  const article = findArticle((await params).slug)
  if (!article) notFound()
  return article
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await load(params)
  return { title: article.title, description: article.excerpt }
}

function Block({ block }: { block: StoryBlock }) {
  if (block.kind === 'paragraph') return <p>{block.text}</p>
  return (
    <div className="rounded-lg border-l-4 border-gold-400 bg-green-50 p-5 sm:p-6">
      <p className="font-semibold text-green-900">{block.intro}</p>
      <ul className="mt-4 space-y-4">
        {block.items.map((item) => (
          <li key={item.term} className="flex gap-3">
            <Icon
              name="bolt"
              className="mt-1.5 size-4 shrink-0 text-green-700"
              fill="currentColor"
            />
            <span>
              <strong className="font-semibold text-green-900">{item.term}:</strong> {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A news story's own page (FR-NEWS-01, D-069): the first photograph leads the story, the rest
 * follow it as a gallery.
 */
export default async function NewsArticlePage({ params }: Props) {
  const article = await load(params)
  const [lead, ...gallery] = article.photos

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
          <time dateTime={article.date}>{formatDate(article.date)}</time>
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

            <div className="space-y-6 p-5 text-lg leading-relaxed sm:p-8">
              {article.body.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>

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
                    <time dateTime={article.date}>{formatDate(article.date)}</time>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Photos</dt>
                  <dd className="text-right font-semibold">{article.photos.length}</dd>
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
