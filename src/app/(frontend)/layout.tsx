import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import { Analytics } from '@/components/layout/Analytics'
import { BackToTop } from '@/components/layout/BackToTop'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { SPLASH_SCRIPT, Splash } from '@/components/layout/Splash'
import { siteUrl } from '@/lib/site-url'

import './globals.css'

// Self-hosted by next/font: the browser never contacts Google (D-025).
// The vietnamese subset carries the dot-below letters used in Yoruba names (ẹ, ọ, ṣ).
const publicSans = Public_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  display: 'swap',
  variable: '--font-public-sans',
})

const SITE_NAME = 'Ogun State Electricity Regulatory Commission (OGSERC)'

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: SITE_NAME,
    template: '%s | OGSERC',
  },
  description: 'Official website of the Ogun State Electricity Regulatory Commission.',
  // './' resolves to each page's own path without its query string, so every page names one
  // official address and filtered or www. variants are not counted as duplicates (D-078).
  alternates: { canonical: './' },
  // Link previews on WhatsApp, Facebook and X. Each page's title and description fill in the rest;
  // the image is opengraph-image.png in this folder.
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_NG', url: './' },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the splash script may add classes to <html> before React hydrates.
    <html lang="en-NG" className={publicSans.variable} suppressHydrationWarning>
      <head>
        {/* A fixed string with no user input; see Splash.tsx and D-038 (CSP hash in step 12). */}
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
        <Analytics />
      </head>
      {/* id="top" is the target of the footer's "Back to top" link (FR-WEB-13). */}
      <body id="top" className="flex min-h-screen flex-col">
        <Splash />
        <SkipLink />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <BackToTop />
        <SiteFooter />
      </body>
    </html>
  )
}
