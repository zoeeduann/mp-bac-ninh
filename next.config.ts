import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'mindfulpeaceth.com' }],
        destination: 'https://www.mindfulpeaceth.com/:path*',
        permanent: true,
      },
    ]
  },
  // Server Actions origin verification: Cloudflare proxies traffic to Vercel,
  // so the Origin header arrives as the public domain while Host may differ.
  // Without allowedOrigins, Next.js 15 rejects every Server Action as CSRF
  // (silently — no console error, just an empty admin tree). Payload admin
  // calls its server function on init, so this manifests as a blank screen.
  experimental: {
    serverActions: {
      allowedOrigins: ['mindfulpeaceth.com', 'www.mindfulpeaceth.com'],
    },
  },
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }, { pathname: '/brand/**' }],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Dev only: Payload emits absolute URLs like http://localhost:3000/api/media/file/…
      // when S3_PUBLIC_HOSTNAME is unset (local disk storage). Allow them so
      // next/image doesn't reject as an unconfigured remote host.
      ...(process.env.NODE_ENV !== 'production'
        ? [{ protocol: 'http' as const, hostname: 'localhost' }]
        : []),
      // R2 bucket-direct domain (resolved at build time if S3_ENDPOINT is set)
      ...(process.env.S3_ENDPOINT
        ? [{ protocol: 'https' as const, hostname: new URL(process.env.S3_ENDPOINT).hostname }]
        : []),
      // R2 custom public hostname (e.g. cdn.mindfulpeaceth.com)
      ...(process.env.S3_PUBLIC_HOSTNAME
        ? [{ protocol: 'https' as const, hostname: process.env.S3_PUBLIC_HOSTNAME }]
        : []),
    ],
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

const payloadConfig = withPayload(nextConfig, { devBundleServerPackages: false })

export default withSentryConfig(payloadConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
})
