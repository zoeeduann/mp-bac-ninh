import { describe, it, expect } from 'vitest'
import {
  isStandaloneVietnamesePath,
  resolveLocaleRewrite,
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
  it('zh-CN default: no rewrite, pathname unchanged', () => {
    expect(resolveLocaleRewrite('/chiangmai/activities')).toEqual({
      locale: 'zh-CN', rewritePath: null, xPathname: '/chiangmai/activities',
    })
  })
  it('root stays zh-CN', () => {
    expect(resolveLocaleRewrite('/')).toEqual({
      locale: 'zh-CN', rewritePath: null, xPathname: '/',
    })
  })
  it('en: rewrites away /en, xPathname is stripped', () => {
    expect(resolveLocaleRewrite('/en/chiangmai/activities')).toEqual({
      locale: 'en', rewritePath: '/chiangmai/activities', xPathname: '/chiangmai/activities',
    })
  })
  it('bare /en rewrites to /', () => {
    expect(resolveLocaleRewrite('/en')).toEqual({
      locale: 'en', rewritePath: '/', xPathname: '/',
    })
  })
  it('en opengraph-image maps back', () => {
    expect(resolveLocaleRewrite('/en/opengraph-image')).toEqual({
      locale: 'en', rewritePath: '/opengraph-image', xPathname: '/opengraph-image',
    })
  })
  it('does not treat a path merely starting with "en" as English', () => {
    expect(resolveLocaleRewrite('/enclave')).toEqual({
      locale: 'zh-CN', rewritePath: null, xPathname: '/enclave',
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
