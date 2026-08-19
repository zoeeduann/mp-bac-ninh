import { NextRequest, NextResponse } from 'next/server'
import { stripLocale } from '@/lib/locale-url'
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
 * Pure decision for a request path: which locale, whether to rewrite away an
 * `/en` prefix, and the `x-pathname` value (always the stripped path so
 * server-side location derivation is locale-independent). Extracted for unit
 * testing without constructing a NextRequest.
 */
export function resolveLocaleRewrite(pathname: string): {
  locale: Locale
  rewritePath: string | null
  xPathname: string
} {
  const isEn = pathname === '/en' || pathname.startsWith('/en/')
  if (isEn) {
    const stripped = stripLocale(pathname)
    return { locale: 'en', rewritePath: stripped, xPathname: stripped }
  }
  return { locale: 'zh-CN', rewritePath: null, xPathname: pathname }
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

export function middleware(req: NextRequest) {
  if (isStandaloneVietnamesePath(req.nextUrl.pathname, SITE_LOCATION_SLUG)) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-locale', 'zh-CN')
    requestHeaders.set('x-pathname', req.nextUrl.pathname)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const { locale, rewritePath, xPathname } = resolveLocaleRewrite(req.nextUrl.pathname)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-locale', locale)

  if (SITE_LOCATION_SLUG) {
    const siteRewrite = resolveSingleLocationRewrite(
      xPathname,
      locale,
      SITE_LOCATION_SLUG,
    )

    // Keep the public URL clean when an old/internal /bac-ninh link is opened.
    if (siteRewrite.redirectPath) {
      const url = req.nextUrl.clone()
      url.pathname = siteRewrite.redirectPath
      return NextResponse.redirect(url, 308)
    }

    const internalPath = siteRewrite.internalPath as string
    requestHeaders.set('x-pathname', internalPath)

    const url = req.nextUrl.clone()
    url.pathname = internalPath
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  requestHeaders.set('x-pathname', xPathname)

  if (rewritePath) {
    const url = req.nextUrl.clone()
    url.pathname = rewritePath // query string is preserved by clone()
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!api|_next|admin|favicon.ico|fonts|.*\\..*).*)'],
}
