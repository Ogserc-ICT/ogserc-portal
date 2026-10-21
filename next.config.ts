import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Baseline headers for every response. A strict Content-Security-Policy is added in build step 12.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // SAMEORIGIN rather than DENY so Payload's admin live preview can frame our own pages.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
]

const nextConfig: NextConfig = {
  // The Dockerfile sets NEXT_OUTPUT=standalone to get a self-contained server bundle.
  // Elsewhere `next start` is used, which does not support standalone output.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // The database-backed end-to-end tests run a second dev server with its own build folder
  // (playwright.db.config.ts), so it never clashes with a dev server already running. Only for
  // that test server: production builds and `next start` always use the default `.next`.
  distDir: process.env.E2E_TEST_SERVER === 'true' && process.env.NODE_ENV !== 'production' ? '.next-e2e' : '.next',
  poweredByHeader: false,
  // The staff password policy reads this list at run time, so the standalone server must carry it,
  // with its licence (data/common-passwords/SOURCE.md).
  outputFileTracingIncludes: {
    '/*': ['data/common-passwords/10k-most-common.txt', 'data/common-passwords/LICENSE'],
  },
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
    // AVIF first (smallest), WebP for browsers without AVIF (D-034).
    formats: ['image/avif', 'image/webp'],
    // 60 for hero photographs behind a dark overlay; 75 (Next's default) for everything else.
    qualities: [60, 75],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
