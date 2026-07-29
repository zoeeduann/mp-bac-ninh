import { describe, expect, it } from 'vitest'
import { t, DICT, DEFAULT_LOCALE, LOCALES } from '../lib/i18n'

describe('t() — key resolution', () => {
  it('resolves top-level nested key for zh-CN', () => {
    expect(t('zh-CN', 'nav.home')).toBe('首页')
  })

  it('resolves top-level nested key for en', () => {
    expect(t('en', 'nav.home')).toBe('Home')
  })

  it('resolves footer key for zh-CN', () => {
    expect(t('zh-CN', 'footer.blurb')).toBe('静心学堂 · 泰国 — 三处学堂,一片心地。')
  })

  it('resolves footer key for en', () => {
    expect(t('en', 'footer.blurb')).toBe('Mindfulpeace Academy Thailand — three academies, one path.')
  })

  it('resolves book.cta key for zh-CN', () => {
    expect(t('zh-CN', 'book.cta')).toBe('我要预约')
  })

  it('resolves book.cta key for en', () => {
    expect(t('en', 'book.cta')).toBe('Book your visit')
  })

  it('resolves common.backToPortal for zh-CN', () => {
    expect(t('zh-CN', 'common.backToPortal')).toBe('← 返回总门户')
  })

  it('returns key as fallback for a missing key', () => {
    expect(t('zh-CN', 'nav.nonexistent')).toBe('nav.nonexistent')
  })

  it('returns key as fallback for a completely unknown key path', () => {
    expect(t('en', 'totally.missing.key')).toBe('totally.missing.key')
  })

  it('returns key as fallback for single-segment missing key', () => {
    expect(t('en', 'unknownSection')).toBe('unknownSection')
  })
})

describe('DICT structure', () => {
  it('has both locales', () => {
    expect(Object.keys(DICT)).toEqual(['zh-CN', 'en'])
  })

  it('DEFAULT_LOCALE is in LOCALES', () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE)
  })
})
