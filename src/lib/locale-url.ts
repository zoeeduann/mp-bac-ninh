import type { Locale } from './i18n'

/**
 * Locale URL prefix helpers. Pure — no React/Next imports — so they are safe to
 * use in the Edge middleware bundle and unit-testable in isolation.
 *
 * Scheme: zh-CN is unprefixed (`/chiangmai`), English carries an `/en` prefix
 * (`/en/chiangmai`).
 */
const EN_PREFIX = '/en'

/** Internal relative href for a locale. zh-CN unprefixed; en gets /en. */
export function localePath(locale: Locale, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (locale !== 'en') return p
  return p === '/' ? EN_PREFIX : `${EN_PREFIX}${p}`
}

/** Absolute URL for canonical / hreflang / sitemap / JSON-LD. */
export function localizedUrl(locale: Locale, path: string, base: string): string {
  return `${base}${localePath(locale, path)}`
}

/** Remove a leading /en segment. Used by client components reading usePathname(). */
export function stripLocale(pathname: string): string {
  if (pathname === EN_PREFIX) return '/'
  if (pathname.startsWith(`${EN_PREFIX}/`)) return pathname.slice(EN_PREFIX.length)
  return pathname
}

/** Swap the locale prefix on a pathname, preserving the remainder. */
export function swapLocalePath(pathname: string, nextLocale: Locale): string {
  return localePath(nextLocale, stripLocale(pathname))
}
