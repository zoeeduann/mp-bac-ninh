import { describe, it, expect } from 'vitest'
import { localePath, localizedUrl, stripLocale, swapLocalePath } from '@/lib/locale-url'

describe('localePath', () => {
  it('prefixes /en for English, leaves zh-CN unchanged', () => {
    expect(localePath('en', '/chiangmai/activities')).toBe('/en/chiangmai/activities')
    expect(localePath('zh-CN', '/chiangmai/activities')).toBe('/chiangmai/activities')
  })
  it('handles root', () => {
    expect(localePath('en', '/')).toBe('/en')
    expect(localePath('zh-CN', '/')).toBe('/')
  })
})

describe('localizedUrl', () => {
  it('returns an absolute URL with the locale prefix', () => {
    expect(localizedUrl('en', '/chiangmai', 'https://x.com')).toBe('https://x.com/en/chiangmai')
    expect(localizedUrl('zh-CN', '/chiangmai', 'https://x.com')).toBe('https://x.com/chiangmai')
  })
})

describe('stripLocale', () => {
  it('removes a leading /en segment', () => {
    expect(stripLocale('/en/chiangmai/activities')).toBe('/chiangmai/activities')
    expect(stripLocale('/en')).toBe('/')
    expect(stripLocale('/chiangmai')).toBe('/chiangmai')
    expect(stripLocale('/')).toBe('/')
  })
  it('does not strip a location that merely starts with "en"', () => {
    expect(stripLocale('/enclave')).toBe('/enclave')
  })
})

describe('swapLocalePath', () => {
  it('switches the prefix while preserving the rest', () => {
    expect(swapLocalePath('/chiangmai/activities', 'en')).toBe('/en/chiangmai/activities')
    expect(swapLocalePath('/en/chiangmai/activities', 'zh-CN')).toBe('/chiangmai/activities')
    expect(swapLocalePath('/en', 'zh-CN')).toBe('/')
    expect(swapLocalePath('/', 'en')).toBe('/en')
  })
})
