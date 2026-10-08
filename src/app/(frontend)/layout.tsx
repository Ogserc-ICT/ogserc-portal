import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'Ogun State Electricity Regulatory Commission (OGSERC)',
  description: 'Official website of the Ogun State Electricity Regulatory Commission.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  )
}
