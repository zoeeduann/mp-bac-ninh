import { describe, it, expect } from 'vitest'
import {
  isStandaloneVietnamesePath,
  resolveLocaleRewrite,
  resolveRequest,
  resolveSingleLocationRewrite,
} from '@/middleware'

describe('isStandaloneVietnamesePath', () => {
  it('reserves /vi only for the dedicated Bac Ninh site', () => {
    expect(isStandaloneVietnamesePath('/vi', 'bac-ninh')).toBe(true)
    expect(isStandaloneVietnamesePath('/vi/llms.txt', 'bac-ninh')).toBe(true)
    expect(isStandaloneVietnamesePath('/vi', null)).toBe(false)
    expect(isStandaloneVietnamesePath('/vi', 'chiangmai')).toBe(false)
  })
})

describe('resolveLocaleRewrite', () => {
  it('zh-CN default: unprefixed public path', () => {
    expect(resolveLocaleRewrite('/chiangmai/activities')).toEqual({
      locale: 'zh-CN', publicPath: '/chiangmai/activities', redirectPath: null,
    })
    expect(resolveLocaleRewrite('/')).toEqual({
      locale: 'zh-CN', publicPath: '/', redirectPath: null,
    })
  })
  it('en: strips the /en prefix', () => {
    expect(resolveLocaleRewrite('/en/chiangmai/activities')).toEqual({
      locale: 'en', publicPath: '/chiangmai/activities', redirectPath: null,
    })
    expect(resolveLocaleRewrite('/en')).toEqual({
      locale: 'en', publicPath: '/', redirectPath: null,
    })
  })
  it('does not treat a path merely starting with "en" as English', () => {
    expect(resolveLocaleRewrite('/enclave')).toEqual({
      locale: 'zh-CN', publicPath: '/enclave', redirectPath: null,
    })
  })
  it('sends direct visits to the internal /zh-CN segment back to the clean URL', () => {
    expect(resolveLocaleRewrite('/zh-CN/activities')).toEqual({
      locale: 'zh-CN', publicPath: '/activities', redirectPath: '/activities',
    })
    expect(resolveLocaleRewrite('/zh-CN')).toEqual({
      locale: 'zh-CN', publicPath: '/', redirectPath: '/',
    })
  })
})

describe('resolveRequest on the single-location Bac Ninh site', () => {
  const site = 'bac-ninh'

  it('rewrites each language to its own internal [locale]/[loc] route', () => {
    expect(resolveRequest('/', site)).toEqual({ action: 'rewrite', pathname: '/zh-CN/bac-ninh' })
    expect(resolveRequest('/about', site)).toEqual({
      action: 'rewrite', pathname: '/zh-CN/bac-ninh/about',
    })
    expect(resolveRequest('/en', site)).toEqual({ action: 'rewrite', pathname: '/en/bac-ninh' })
    expect(resolveRequest('/en/activities/tea', site)).toEqual({
      action: 'rewrite', pathname: '/en/bac-ninh/activities/tea',
    })
  })

  it('routes campaign landing pages through the same internal prefix', () => {
    expect(resolveRequest('/discover/buddhism', site)).toEqual({
      action: 'rewrite', pathname: '/zh-CN/bac-ninh/discover/buddhism',
    })
  })

  it('leaves the standalone Vietnamese page alone', () => {
    expect(resolveRequest('/vi', site)).toEqual({ action: 'next' })
    expect(resolveRequest('/vi/llms.txt', site)).toEqual({ action: 'next' })
  })

  it('redirects internal paths back to clean public URLs in one hop', () => {
    expect(resolveRequest('/bac-ninh/about', site)).toEqual({ action: 'redirect', pathname: '/about' })
    expect(resolveRequest('/en/bac-ninh', site)).toEqual({ action: 'redirect', pathname: '/en' })
    expect(resolveRequest('/zh-CN/about', site)).toEqual({ action: 'redirect', pathname: '/about' })
    expect(resolveRequest('/zh-CN/bac-ninh/journal', site)).toEqual({
      action: 'redirect', pathname: '/journal',
    })
    expect(resolveRequest('/zh-CN', site)).toEqual({ action: 'redirect', pathname: '/' })
  })

  it('redirects merged activity pages in both languages', () => {
    expect(resolveRequest('/activities/health-circle', site)).toEqual({
      action: 'redirect', pathname: '/activities/healthy-circulation-cycle',
    })
    expect(resolveRequest('/en/activities/health-circle', site)).toEqual({
      action: 'redirect', pathname: '/en/activities/healthy-circulation-cycle',
    })
  })
})

describe('resolveRequest without a dedicated location', () => {
  it('rewrites Chinese URLs under /zh-CN and serves /en paths as they are', () => {
    expect(resolveRequest('/', null)).toEqual({ action: 'rewrite', pathname: '/zh-CN' })
    expect(resolveRequest('/chiangmai/about', null)).toEqual({
      action: 'rewrite', pathname: '/zh-CN/chiangmai/about',
    })
    expect(resolveRequest('/en/chiangmai/about', null)).toEqual({ action: 'next' })
    expect(resolveRequest('/en', null)).toEqual({ action: 'next' })
  })
  it('does not apply Bac Ninh merged-activity redirects', () => {
    expect(resolveRequest('/activities/health-circle', null)).toEqual({
      action: 'rewrite', pathname: '/zh-CN/activities/health-circle',
    })
  })
})

describe('resolveSingleLocationRewrite', () => {
  it('maps clean public paths to the internal location route', () => {
    expect(resolveSingleLocationRewrite('/', 'zh-CN', 'bac-ninh')).toEqual({
      internalPath: '/bac-ninh',
      redirectPath: null,
    })
    expect(resolveSingleLocationRewrite('/activities/tea', 'en', 'bac-ninh')).toEqual({
      internalPath: '/bac-ninh/activities/tea',
      redirectPath: null,
    })
  })

  it('redirects internal location paths back to clean public URLs', () => {
    expect(resolveSingleLocationRewrite('/bac-ninh', 'zh-CN', 'bac-ninh')).toEqual({
      internalPath: null,
      redirectPath: '/',
    })
    expect(
      resolveSingleLocationRewrite('/bac-ninh/journal/one', 'en', 'bac-ninh'),
    ).toEqual({
      internalPath: null,
      redirectPath: '/en/journal/one',
    })
  })
})
