import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'

import './globals.css'

// Self-hosted by next/font: the browser never contacts Google (D-025).
// The vietnamese subset carries the dot-below letters used in Yoruba names (ẹ, ọ, ṣ).
const publicSans = Public_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  display: 'swap',
  variable: '--font-public-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Ogun State Electricity Regulatory Commission (OGSERC)',
    template: '%s | OGSERC',
  },
  description: 'Official website of the Ogun State Electricity Regulatory Commission.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG" className={publicSans.variable}>
      <body className="flex min-h-screen flex-col">
        <SkipLink />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  )
}
