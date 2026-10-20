import { NextRequest, NextResponse } from 'next/server'
import { localePath, stripLocale } from '@/lib/locale-url'
import { MERGED_ACTIVITY_PATHS } from '@/lib/merged-activities'
import type { Locale } from '@/lib/i18n'
import { SITE_LOCATION_SLUG } from '@/lib/site-config'

export function isStandaloneVietnamesePath(
  pathname: string,
  siteLocationSlug: string | null,
): boolean {
  return siteLocationSlug === 'bac-ninh' &&
    (pathname === '/vi' || pathname.startsWith('/vi/'))
}

/**
 * Split the language off a public URL. zh-CN stays unprefixed and English
 * carries /en; direct visits to the internal /zh-CN segment are sent back to
 * the clean URL (middleware is not re-entered for its own rewrite).
 */
export function resolveLocaleRewrite(pathname: string): {
  locale: Locale
  publicPath: string
  redirectPath: string | null
} {
  if (pathname === '/zh-CN' || pathname.startsWith('/zh-CN/')) {
    const publicPath = stripLocale(pathname)
    return { locale: 'zh-CN', publicPath, redirectPath: publicPath }
  }
  const isEn = pathname === '/en' || pathname.startsWith('/en/')
  return { locale: isEn ? 'en' : 'zh-CN', publicPath: stripLocale(pathname), redirectPath: null }
}

export function resolveSingleLocationRewrite(
  pathname: string,
  locale: Locale,
  siteLocationSlug: string,
): { internalPath: string; redirectPath: null } | { internalPath: null; redirectPath: string } {
  const locationPrefix = `/${siteLocationSlug}`
  const isPrefixed =
    pathname === locationPrefix || pathname.startsWith(`${locationPrefix}/`)

  if (isPrefixed) {
    const publicPath = pathname.slice(locationPrefix.length) || '/'
    return {
      internalPath: null,
      redirectPath:
        locale === 'en'
          ? (publicPath === '/' ? '/en' : `/en${publicPath}`)
          : publicPath,
    }
  }

  return {
    internalPath: pathname === '/' ? locationPrefix : `${locationPrefix}${pathname}`,
    redirectPath: null,
  }
}

export type MiddlewareDecision =
  | { action: 'next' }
  | { action: 'rewrite'; pathname: string }
  | { action: 'redirect'; pathname: string }

/**
 * Pure routing decision for a request path, extracted for unit testing.
 * Public pages render under an internal [locale] segment (and, on a
 * single-location site, its /[loc] segment), so each language is its own ISR
 * entry and no page has to read request headers.
 */
export function resolveRequest(
  pathname: string,
  siteLocationSlug: string | null,
): MiddlewareDecision {
  if (isStandaloneVietnamesePath(pathname, siteLocationSlug)) return { action: 'next' }

  const { locale, publicPath, redirectPath } = resolveLocaleRewrite(pathname)
  if (redirectPath) {
    // Follow on to the final clean URL in one hop (e.g. /zh-CN/bac-ninh -> /).
    const next = resolveRequest(redirectPath, siteLocationSlug)
    return { action: 'redirect', pathname: next.action === 'redirect' ? next.pathname : redirectPath }
  }

  // Duplicate activity pages merged into one per series keep working.
  const merged = siteLocationSlug ? MERGED_ACTIVITY_PATHS[publicPath] : undefined
  if (merged) return { action: 'redirect', pathname: localePath(locale, merged) }

  let internalPath = publicPath
  if (siteLocationSlug) {
    const siteRewrite = resolveSingleLocationRewrite(publicPath, locale, siteLocationSlug)
    // Keep the public URL clean when an old/internal /bac-ninh link is opened.
    if (siteRewrite.redirectPath) return { action: 'redirect', pathname: siteRewrite.redirectPath }
    internalPath = siteRewrite.internalPath as string
  }

  const target = `/${locale}${internalPath === '/' ? '' : internalPath}`
  return target === pathname ? { action: 'next' } : { action: 'rewrite', pathname: target }
}

export function middleware(req: NextRequest) {
  const decision = resolveRequest(req.nextUrl.pathname, SITE_LOCATION_SLUG)
  if (decision.action === 'next') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = decision.pathname // query string is preserved by clone()
  return decision.action === 'redirect'
    ? NextResponse.redirect(url, 308)
    : NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api|_next|admin|favicon.ico|fonts|.*\\..*).*)'],
}
