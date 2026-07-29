import type { Locale } from './i18n'
import { localePath, localizedUrl } from './locale-url'

export const SITE_BASE =
  process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, '') || 'http://localhost:3000'

/**
 * Set this in a dedicated deployment to expose one location at the site root.
 * The internal App Router route remains /[loc], while public URLs become /,
 * /activities, /journal, etc.
 */
export const SITE_LOCATION_SLUG =
  process.env.NEXT_PUBLIC_SITE_LOCATION_SLUG?.trim() || null

export function isSingleLocationSite(slug: string): boolean {
  return SITE_LOCATION_SLUG === slug
}

export function locationPublicPath(slug: string, suffix = ''): string {
  const normalizedSuffix =
    suffix === '' || suffix.startsWith('/') || suffix.startsWith('?')
      ? suffix
      : `/${suffix}`

  if (isSingleLocationSite(slug)) return normalizedSuffix || '/'
  return `/${slug}${normalizedSuffix}`
}

export function locationPath(locale: Locale, slug: string, suffix = ''): string {
  return localePath(locale, locationPublicPath(slug, suffix))
}

export function locationUrl(locale: Locale, slug: string, suffix = ''): string {
  return localizedUrl(locale, locationPublicPath(slug, suffix), SITE_BASE)
}
