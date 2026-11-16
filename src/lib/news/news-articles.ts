/**
 * News stories, as supplied by OGSERC. Like the public notices (D-065), they sit in code until
 * build step 9 brings the News collection (FR-NEWS-01); the step 4 seed must carry them, and their
 * photographs, into the CMS.
 *
 * Text is the story as supplied (owner, 2026-11-16); only the title's capitals are changed to title
 * case. Photographs have plain descriptions for screen readers but no captions or names (owner).
 */

import type { StaticImageData } from 'next/image'

import nerc1 from '@/assets/news/ogserc-visits-nerc/photo-1.jpg'
import nerc1Thumb from '@/assets/news/ogserc-visits-nerc/photo-1-thumb.jpg'
import nerc2 from '@/assets/news/ogserc-visits-nerc/photo-2.jpg'
import nerc2Thumb from '@/assets/news/ogserc-visits-nerc/photo-2-thumb.jpg'
import nerc3 from '@/assets/news/ogserc-visits-nerc/photo-3.jpg'
import nerc3Thumb from '@/assets/news/ogserc-visits-nerc/photo-3-thumb.jpg'
import nerc4 from '@/assets/news/ogserc-visits-nerc/photo-4.jpg'
import nerc4Thumb from '@/assets/news/ogserc-visits-nerc/photo-4-thumb.jpg'
import nerc5 from '@/assets/news/ogserc-visits-nerc/photo-5.jpg'
import nerc5Thumb from '@/assets/news/ogserc-visits-nerc/photo-5-thumb.jpg'
import nerc6 from '@/assets/news/ogserc-visits-nerc/photo-6.jpg'
import nerc6Thumb from '@/assets/news/ogserc-visits-nerc/photo-6-thumb.jpg'
import nerc7 from '@/assets/news/ogserc-visits-nerc/photo-7.jpg'
import nerc7Thumb from '@/assets/news/ogserc-visits-nerc/photo-7-thumb.jpg'
import { routes } from '@/lib/navigation'

/**
 * A photograph in two sizes, made by resizing the originals before commit: the VPS serves images
 * as they are (IMAGE_PROCESSING=off, D-056), so grids and cards need their own small copy.
 */
export type NewsPhoto = { full: StaticImageData; thumb: StaticImageData; alt: string }

export type Highlight = { term: string; text: string }

export type StoryBlock =
  { kind: 'paragraph'; text: string } | { kind: 'highlights'; intro: string; items: Highlight[] }

export type NewsArticle = {
  slug: string
  title: string
  /** Publication date; lists sort by it. */
  date: string
  /** One line for cards and search results. */
  excerpt: string
  body: StoryBlock[]
  /** The first photograph leads the story; the rest make up its gallery. */
  photos: NewsPhoto[]
}

export const newsArticles: NewsArticle[] = [
  {
    slug: 'ogserc-visits-nerc',
    title: 'OGSERC Visits NERC to Strengthen Regulatory Collaboration',
    date: '2026-11-13',
    excerpt:
      'An OGSERC delegation led by Chairman-Designate Engr. Jide Onakoya paid a courtesy visit to NERC on capacity building, knowledge sharing and consumer protection.',
    body: [
      {
        kind: 'paragraph',
        text: 'The Ogun State Electricity Regulatory Commission (OGSERC) has reaffirmed its commitment to strengthening regulatory cooperation with the Nigerian Electricity Regulatory Commission (NERC) as it prepares to assume full oversight of the electricity market in Ogun State.',
      },
      {
        kind: 'paragraph',
        text: 'The commitment was underscored during a courtesy visit by an OGSERC delegation, led by its Chairman-Designate, Engr. Jide Onakoya, to NERC on Friday, 13 November, 2026. The delegation was received by the Chairman of NERC, Dr. Musiliu Oseni.',
      },
      {
        kind: 'paragraph',
        text: "The visit provided a platform for both regulatory institutions to explore areas of cooperation, particularly in capacity development, institutional support and the exchange of regulatory knowledge and best practices to strengthen OGSERC's capacity to effectively regulate the Ogun State electricity market.",
      },
      {
        kind: 'paragraph',
        text: 'Discussions also centred on developing the technical and institutional competencies required for effective market oversight, with particular emphasis on consumer protection, tariff setting and the implementation of sound regulatory frameworks.',
      },
      {
        kind: 'highlights',
        intro: 'Key highlights of the engagement included:',
        items: [
          {
            term: 'Strengthening inter-regulatory cooperation',
            text: "Both Commissions reaffirmed their commitment to sustained collaboration within Nigeria's evolving electricity regulatory landscape, following the decentralisation of electricity regulation under the Electricity Act 2023.",
          },
          {
            term: 'Capacity building',
            text: 'Identification of critical areas for institutional and technical capacity development for OGSERC, particularly in tariff determination, consumer protection and market regulation.',
          },
          {
            term: 'Knowledge sharing and institutional support',
            text: "Commitment to facilitating the exchange of expertise, regulatory experience and best practices to enhance OGSERC's operational effectiveness.",
          },
          {
            term: 'Consumer protection and investment promotion',
            text: 'Readiness to work together to promote efficient regulatory oversight, safeguard electricity consumers and create an enabling environment for investment in the Ogun State electricity market.',
          },
        ],
      },
      {
        kind: 'paragraph',
        text: 'The engagement underscores the importance of cooperation between federal and state electricity regulators in ensuring a coordinated and effective regulatory framework.',
      },
      {
        kind: 'paragraph',
        text: 'It also reflects the shared commitment of NERC and OGSERC to supporting the development of sustainable subnational electricity markets that are efficient, reliable, competitive, and responsive to the needs of electricity consumers.',
      },
    ],
    photos: [
      {
        full: nerc1,
        thumb: nerc1Thumb,
        alt: 'The OGSERC delegation and NERC officials standing together in front of the NERC logo.',
      },
      {
        full: nerc2,
        thumb: nerc2Thumb,
        alt: 'Group photograph of the OGSERC delegation and NERC officials at NERC.',
      },
      {
        full: nerc3,
        thumb: nerc3Thumb,
        alt: 'Participants seated along the meeting table, taking notes.',
      },
      {
        full: nerc4,
        thumb: nerc4Thumb,
        alt: 'A participant speaking during the meeting.',
      },
      {
        full: nerc5,
        thumb: nerc5Thumb,
        alt: 'A participant listening during the meeting.',
      },
      {
        full: nerc6,
        thumb: nerc6Thumb,
        alt: 'Participants at the meeting table during the discussions.',
      },
      {
        full: nerc7,
        thumb: nerc7Thumb,
        alt: 'Participants seated across the table during the meeting.',
      },
    ],
  },
]

export const findArticle = (slug: string): NewsArticle | undefined =>
  newsArticles.find((article) => article.slug === slug)

export const articleHref = (article: NewsArticle): string => `${routes.news.path}/${article.slug}`
