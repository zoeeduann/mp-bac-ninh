/**
 * schema.org JSON-LD builders.
 *
 * Pure functions that turn Payload docs into structured-data objects. Render
 * them with <JsonLd data={...} />. Kept framework-free (no React) so they can
 * be unit-tested in isolation.
 */
import type { Locale } from './i18n'
import { BASE } from './metadata'
import { NETWORK_ALTERNATE_NAMES, networkSeoDescription, seoKeywordText, seoTopics } from './seo'

type Json = Record<string, unknown>

/** Drop undefined/null/empty values so JSON-LD stays clean. */
function compact<T extends Json>(obj: T): T {
  for (const k of Object.keys(obj)) {
    const v = (obj as Json)[k]
    if (v === undefined || v === null || v === '') delete (obj as Json)[k]
  }
  return obj
}

/**
 * Flatten a Payload Lexical richText value to plain text. Used for FAQ
 * answers, which must be a string in schema.org FAQPage.acceptedAnswer.
 */
export function richTextToPlain(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const root = (value as { root?: { children?: unknown[] } }).root
  if (!root?.children) return ''

  const walk = (nodes: unknown[]): string =>
    nodes
      .map((n) => {
        const node = n as { text?: string; children?: unknown[]; type?: string }
        if (typeof node.text === 'string') return node.text
        if (Array.isArray(node.children)) {
          const inner = walk(node.children)
          // Block-level nodes get a trailing space so words don't run together.
          return node.type === 'paragraph' || node.type === 'listitem' ? `${inner} ` : inner
        }
        return ''
      })
      .join('')

  return walk(root.children).replace(/\s+/g, ' ').trim()
}

/**
 * Best-effort latitude/longitude extraction from a Google Maps embed URL.
 * Embed URLs encode the marker as `!3d<lat>!2d<lng>` (place mode) or carry a
 * `!2d<lng>!3d<lat>` pair. Returns null when no coordinate pair is present.
 */
export function geoFromMapEmbed(
  mapEmbedUrl: string | null | undefined,
): { latitude: number; longitude: number } | null {
  if (!mapEmbedUrl) return null
  const lat = mapEmbedUrl.match(/!3d(-?\d+\.\d+)/)
  const lng = mapEmbedUrl.match(/!2d(-?\d+\.\d+)/)
  if (lat && lng) {
    return { latitude: parseFloat(lat[1]), longitude: parseFloat(lng[1]) }
  }
  return null
}

const ORG_NAME_EN = 'Mindfulpeace Academy Thailand'
const ORG_LOGO_PATH = '/brand/master-logo.png'
const ORG_IMAGE_PATH = '/brand/master-logo-with-positioning.png'

function absoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).toString()
  } catch {
    return new URL(url, BASE).toString()
  }
}

function topicThings(locale: Locale): Json[] {
  return seoTopics(locale).map((name) => ({ '@type': 'Thing', name }))
}

export interface OrganizationLocationInput {
  name: string
  city: string
  url: string
  address?: string | null
  imageUrl?: string | null
}

export function organizationJsonLd(input: {
  url: string
  locale: Locale
  locations?: OrganizationLocationInput[]
}): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': `${input.url.replace(/\/$/, '')}/#organization`,
    name: ORG_NAME_EN,
    alternateName: NETWORK_ALTERNATE_NAMES,
    url: input.url,
    logo: absoluteUrl(ORG_LOGO_PATH),
    image: absoluteUrl(ORG_IMAGE_PATH),
    description: networkSeoDescription(input.locale),
    sameAs: ['https://mindfulpeace.org/'],
    areaServed: [
      { '@type': 'City', name: 'Bangkok' },
      { '@type': 'City', name: 'Chiang Mai' },
      { '@type': 'City', name: 'Phuket' },
      { '@type': 'Country', name: 'Thailand' },
    ],
    knowsAbout: topicThings(input.locale),
    department:
      input.locations && input.locations.length > 0
        ? input.locations.map((loc) =>
            compact({
              '@type': ['LocalBusiness', 'EducationalOrganization'],
              '@id': `${loc.url}#localbusiness`,
              name: loc.name,
              url: loc.url,
              image: absoluteUrl(loc.imageUrl),
              address: loc.address
                ? {
                    '@type': 'PostalAddress',
                    streetAddress: loc.address,
                    addressLocality: loc.city,
                    addressCountry: 'TH',
                  }
                : undefined,
            }),
          )
        : undefined,
  })
}

export function websiteJsonLd(input: { url: string; locale: Locale }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${input.url.replace(/\/$/, '')}/#website`,
    name: input.locale === 'zh-CN' ? '静心学堂 · 泰国' : ORG_NAME_EN,
    alternateName: NETWORK_ALTERNATE_NAMES,
    url: input.url,
    inLanguage: input.locale,
    description: networkSeoDescription(input.locale),
    about: topicThings(input.locale),
    publisher: {
      '@id': `${BASE.replace(/\/$/, '')}/#organization`,
    },
  }
}

export interface LocalBusinessInput {
  displayName: string
  city: string
  url: string
  locale: Locale
  address?: string | null
  mapEmbedUrl?: string | null
  email?: string | null
  phone?: string | null
  imageUrl?: string | null
  description?: string | null
  sameAs?: string[]
  isThailandNetwork?: boolean
}

/**
 * LocalBusiness for an academy home page. The strongest local-intent signal —
 * lets "meditation Chiang Mai" / "清迈 静心" style queries match a real place
 * with address, geo, and contact channels.
 */
export function localBusinessJsonLd(input: LocalBusinessInput): Json {
  const geo = geoFromMapEmbed(input.mapEmbedUrl)
  const isThailandNetwork = input.isThailandNetwork !== false
  return compact({
    '@context': 'https://schema.org',
    // Dual-typed: a physical local business that is also a teaching org.
    '@type': ['LocalBusiness', 'EducationalOrganization'],
    '@id': `${input.url}#localbusiness`,
    name: input.displayName,
    alternateName: [
      input.displayName,
      input.locale === 'zh-CN' ? `${input.city}静心学堂` : `${input.city} Mindfulpeace Academy`,
    ],
    url: input.url,
    image: absoluteUrl(input.imageUrl),
    description:
      input.description ??
      (isThailandNetwork ? networkSeoDescription(input.locale) : undefined),
    email: input.email ?? undefined,
    telephone: input.phone ?? undefined,
    address: compact({
      '@type': 'PostalAddress',
      streetAddress: input.address ?? undefined,
      addressLocality: input.city,
      addressCountry: isThailandNetwork ? 'TH' : undefined,
    }),
    geo: geo
      ? { '@type': 'GeoCoordinates', latitude: geo.latitude, longitude: geo.longitude }
      : undefined,
    parentOrganization: isThailandNetwork
      ? {
          '@type': 'Organization',
          name: ORG_NAME_EN,
          url: BASE,
        }
      : undefined,
    areaServed: [
      { '@type': 'City', name: input.city },
      ...(isThailandNetwork ? [{ '@type': 'Country', name: 'Thailand' }] : []),
    ],
    knowsAbout: topicThings(input.locale),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name:
        input.locale === 'zh-CN'
          ? '佛学、禅修与正念活动'
          : 'Buddhism, Zen meditation, and mindfulness programs',
      itemListElement: seoTopics(input.locale)
        .slice(0, 6)
        .map((name) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name },
          price: '0',
          ...(isThailandNetwork ? { priceCurrency: 'THB' } : {}),
        })),
    },
    sameAs: input.sameAs && input.sameAs.length > 0 ? input.sameAs : undefined,
  })
}

export interface FaqItem {
  q?: string | null
  a?: unknown
}

export interface PlainFaqItem {
  question?: string | null
  answer?: string | null
}

/** FAQPage from a location's FAQ array. Returns null when there are no items. */
export function faqPageJsonLd(faq: FaqItem[] | null | undefined): Json | null {
  if (!faq || faq.length === 0) return null
  const entities = faq
    .map((item) => {
      const question = item.q?.trim()
      const answer = richTextToPlain(item.a)
      if (!question || !answer) return null
      return {
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      }
    })
    .filter(Boolean)
  if (entities.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entities,
  }
}

/** FAQPage from plain question/answer strings. */
export function plainFaqPageJsonLd(faq: PlainFaqItem[] | null | undefined): Json | null {
  if (!faq || faq.length === 0) return null
  const entities = faq
    .map((item) => {
      const question = item.question?.trim()
      const answer = item.answer?.trim()
      if (!question || !answer) return null
      return {
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      }
    })
    .filter(Boolean)
  if (entities.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entities,
  }
}

/** BreadcrumbList from an ordered list of {name, url} crumbs. */
export function breadcrumbJsonLd(items: { name: string; url: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

export function itemListJsonLd(input: {
  name: string
  url: string
  items: { name: string; url: string; description?: string | null; imageUrl?: string | null }[]
}): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    url: input.url,
    itemListElement: input.items.map((item, i) =>
      compact({
        '@type': 'ListItem',
        position: i + 1,
        url: item.url,
        item: compact({
          '@type': 'Thing',
          name: item.name,
          url: item.url,
          description: item.description ?? undefined,
          image: absoluteUrl(item.imageUrl),
        }),
      }),
    ),
  }
}

export function articleJsonLd(input: {
  headline: string
  url: string
  locale: Locale
  datePublished?: string | null
  dateModified?: string | null
  description?: string | null
  imageUrl?: string | null
  authorName?: string | null
  authorUrl?: string | null
  publisherName?: string | null
  publisherUrl?: string | null
  keywords?: string[]
}): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    mainEntityOfPage: input.url,
    url: input.url,
    inLanguage: input.locale,
    description: input.description ?? undefined,
    image: absoluteUrl(input.imageUrl),
    datePublished: input.datePublished ?? undefined,
    dateModified: input.dateModified ?? input.datePublished ?? undefined,
    author: {
      '@type': 'Organization',
      name: input.authorName ?? ORG_NAME_EN,
      url: input.authorUrl ?? BASE,
    },
    publisher:
      input.publisherName || input.publisherUrl
        ? {
            '@type': 'Organization',
            name: input.publisherName ?? input.authorName ?? ORG_NAME_EN,
            url: input.publisherUrl ?? input.authorUrl ?? BASE,
          }
        : {
            '@id': `${BASE.replace(/\/$/, '')}/#organization`,
          },
    about: topicThings(input.locale),
    keywords: input.keywords?.join(', ') ?? seoKeywordText(input.locale),
  })
}
