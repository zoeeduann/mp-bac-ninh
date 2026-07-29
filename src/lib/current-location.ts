import type { Locale } from './i18n'
import { stripLocale } from './locale-url'

export type LocationSlug = string
export const THAILAND_NETWORK_SLUGS: LocationSlug[] = ['bangkok', 'chiangmai', 'phuket']
export const LOCATION_SLUGS: LocationSlug[] = [...THAILAND_NETWORK_SLUGS, 'bac-ninh']

export function extractLocationSlug(pathname: string): LocationSlug | null {
  const first = stripLocale(pathname).split('/').filter(Boolean)[0]
  return LOCATION_SLUGS.includes(first as LocationSlug) ? (first as LocationSlug) : null
}

/** Server-component helper: read current location from request headers */
export async function getCurrentLocationSlug(): Promise<LocationSlug | null> {
  const { headers } = await import('next/headers')
  const h = await headers()
  const pathname = h.get('x-pathname') || h.get('x-invoke-path') || '/'
  return extractLocationSlug(pathname)
}

/** Fetch the Location doc for a given slug. Returns null if not found. */
export async function getLocationBySlug(slug: LocationSlug, locale: Locale = 'zh-CN') {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'locations',
    where: { slug: { equals: slug } },
    limit: 1,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
  return result.docs[0] || null
}

/** Fetch every location, including independently hosted academy pages. */
export async function getAllLocations(locale: Locale = 'zh-CN') {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'locations',
    sort: 'order',
    limit: 10,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
  return result.docs
}

/** Fetch only academies that belong to the Mindfulpeace Thailand portal. */
export async function getThailandNetworkLocations(locale: Locale = 'zh-CN') {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'locations',
    where: { isThailandNetwork: { equals: true } },
    sort: 'order',
    limit: 10,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
  return result.docs
}

export function isThailandNetworkLocation(
  location: { slug?: string | null; isThailandNetwork?: boolean | null },
): boolean {
  // The slug fallback keeps old cached/API documents safe during rollout.
  return typeof location.isThailandNetwork === 'boolean'
    ? location.isThailandNetwork
    : THAILAND_NETWORK_SLUGS.includes(location.slug ?? '')
}

export function locationSiteName(
  location: { slug?: string | null; name: string; isThailandNetwork?: boolean | null },
  locale: Locale,
): string {
  if (!isThailandNetworkLocation(location)) return location.name
  return locale === 'zh-CN' ? '静心学堂 · 泰国' : 'Mindfulpeace Academy Thailand'
}
