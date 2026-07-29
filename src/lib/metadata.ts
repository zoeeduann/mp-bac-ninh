import type { Metadata } from 'next'
import type { Locale } from './i18n'
import { seoKeywords } from './seo'
import { SITE_BASE } from './site-config'

export interface BuildMetaOptions {
  title: string
  description: string
  url: string
  imageUrl?: string
  locale: Locale
  siteName?: string
  alternateLanguages?: { 'zh-CN'?: string; en?: string }
  keywords?: string[]
}

export const BASE = SITE_BASE

export function buildMetadata(opts: BuildMetaOptions): Metadata {
  const ogLocale = opts.locale === 'zh-CN' ? 'zh_CN' : 'en_US'
  const siteName =
    opts.siteName ??
    (opts.locale === 'zh-CN' ? '静心学堂 · 泰国' : 'Mindfulpeace Academy Thailand')
  const isThailandNetworkSite =
    siteName === '静心学堂 · 泰国' || siteName === 'Mindfulpeace Academy Thailand'
  return {
    // Resolves relative OG/Twitter image URLs (incl. the file-convention
    // opengraph-image fallback) to absolute URLs. Without it Next warns and
    // falls back to localhost.
    metadataBase: new URL(new URL(opts.url).origin),
    title: opts.title,
    description: opts.description,
    applicationName: siteName,
    keywords: opts.keywords?.length ? opts.keywords : seoKeywords(opts.locale),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    alternates: {
      canonical: opts.url,
      // hreflang: each language self-references a distinct URL; x-default
      // points crawlers at the zh-CN (default) version.
      ...(opts.alternateLanguages
        ? {
            languages: {
              ...opts.alternateLanguages,
              'x-default': opts.alternateLanguages['zh-CN'] ?? opts.url,
            },
          }
        : {}),
    },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.url,
      locale: ogLocale,
      type: 'website',
      siteName,
      ...(opts.imageUrl
        ? { images: [{ url: opts.imageUrl, width: 1200, height: 630 }] }
        : !isThailandNetworkSite
          ? { images: [] }
          : {}),
    },
    twitter: {
      card: opts.imageUrl ? 'summary_large_image' : 'summary',
      title: opts.title,
      description: opts.description,
      ...(opts.imageUrl
        ? { images: [opts.imageUrl] }
        : !isThailandNetworkSite
          ? { images: [] }
          : {}),
    },
  }
}
