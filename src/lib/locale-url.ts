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

/**
 * Absolute URL for canonical / hreflang / sitemap / JSON-LD. The zh-CN root is
 * the bare origin (no trailing slash): Next renders canonical and hreflang that
 * way, so the sitemap and IndexNow must match it.
 */
export function localizedUrl(locale: Locale, path: string, base: string): string {
  const localized = localePath(locale, path)
  return localized === '/' ? base.replace(/\/$/, '') : `${base}${localized}`
}

/** Normalize both public /en and the internal /zh-CN rewrite during prerendering. */
export function stripLocale(pathname: string): string {
  for (const prefix of [EN_PREFIX, '/zh-CN']) {
    if (pathname === prefix) return '/'
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length)
  }
  return pathname
}

/** Swap the locale prefix on a pathname, preserving the remainder. */
export function swapLocalePath(pathname: string, nextLocale: Locale): string {
  return localePath(nextLocale, stripLocale(pathname))
}

/**
 * Target of the header language toggle. A Chinese detail page with no English
 * translation links to the English list it belongs to (its parent path)
 * instead of an /en URL that has no English content.
 */
export function languageToggleHref(
  pathname: string,
  nextLocale: Locale,
  zhOnlyPaths: readonly string[],
): string {
  const stripped = stripLocale(pathname)
  if (nextLocale === 'en' && zhOnlyPaths.length > 0) {
    let decoded = stripped
    try {
      decoded = decodeURIComponent(stripped)
    } catch {
      // keep the raw path when it is not valid percent-encoding
    }
    if (zhOnlyPaths.includes(decoded)) {
      return localePath('en', decoded.replace(/\/[^/]+$/, '') || '/')
    }
  }
  return swapLocalePath(pathname, nextLocale)
}
