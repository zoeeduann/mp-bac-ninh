import { describe, expect, it } from 'vitest'
import { getBacNinhBrandCopy } from '@/lib/bac-ninh-copy'

describe('Bac Ninh brand copy', () => {
  it('keeps the three learning paths aligned across both languages', () => {
    const zh = getBacNinhBrandCopy('zh-CN')
    const en = getBacNinhBrandCopy('en')

    expect(zh.paths.map((path) => path.title)).toEqual(['禅意生活', '智慧人生', '觉醒之道'])
    expect(en.paths.map((path) => path.title)).toEqual([
      'Chan-inspired Living',
      'Wisdom in Life',
      'Path to Awakening',
    ])
  })

  it('keeps the independent Bac Ninh copy free of Thailand references', () => {
    const allCopy = JSON.stringify([
      getBacNinhBrandCopy('zh-CN'),
      getBacNinhBrandCopy('en'),
    ])

    expect(allCopy).not.toContain('泰国')
    expect(allCopy).not.toMatch(/\bThailand\b/i)
  })
})
