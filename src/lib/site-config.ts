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

const TURNSTILE_ENABLED_OVERRIDE =
  process.env.NEXT_PUBLIC_TURNSTILE_ENABLED?.trim().toLowerCase()

/**
 * Cloudflare's challenge host is not consistently reachable from mainland
 * China. Keep Turnstile on for the Thailand network site, but default it off
 * for the dedicated Bac Ninh deployment. Either deployment can override this
 * explicitly through its public environment variables.
 */
export const TURNSTILE_ENABLED =
  TURNSTILE_ENABLED_OVERRIDE === 'true'
    ? true
    : TURNSTILE_ENABLED_OVERRIDE === 'false'
      ? false
      : SITE_LOCATION_SLUG !== 'bac-ninh'

const DEFAULT_GOOGLE_ANALYTICS_IDS: Record<string, string> = {
  'bac-ninh': 'G-0WNPPNKYE4',
}

/**
 * Keep analytics data separated across dedicated location sites. Deployments
 * can override the mapped/default ID without requiring a code change.
 */
export const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim() ||
  (SITE_LOCATION_SLUG
    ? DEFAULT_GOOGLE_ANALYTICS_IDS[SITE_LOCATION_SLUG]
    : 'G-Y8SDHSFT9N') ||
  null

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
