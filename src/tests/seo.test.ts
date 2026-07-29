import { describe, expect, it } from 'vitest'
import {
  activitySeoDescription,
  activitySeoKeywords,
  locationSeoDescription,
  locationSeoKeywords,
  networkSeoDescription,
  seoKeywords,
} from '@/lib/seo'

describe('SEO helpers', () => {
  it('includes Buddhist, Zen, and location terms for Chinese pages', () => {
    const keywords = locationSeoKeywords('zh-CN', '清迈', '心灯学堂')
    expect(keywords).toContain('佛学')
    expect(keywords).toContain('禅修')
    expect(keywords).toContain('清迈佛学')
    expect(keywords).toContain('心灯学堂禅修')
  })

  it('includes Buddhism and Zen terms for English pages', () => {
    const keywords = seoKeywords('en')
    expect(keywords).toContain('Buddhism')
    expect(keywords).toContain('Zen meditation')
    expect(keywords).toContain('meditation Chiang Mai')
  })

  it('builds natural descriptions instead of bare keyword lists', () => {
    expect(networkSeoDescription('zh-CN')).toContain('佛学')
    expect(locationSeoDescription({
      locale: 'en',
      city: 'Chiang Mai',
      displayName: 'Xindeng Academy',
    })).toContain('Zen meditation')
  })

  it('prefers editor-written activity SEO descriptions', () => {
    expect(activitySeoDescription({
      locale: 'zh-CN',
      title: '禅茶共修',
      displayName: '心灯学堂',
      city: '清迈',
      shortDesc: 'fallback',
      seoDescription: '自定义 SEO 描述',
    })).toBe('自定义 SEO 描述')
  })

  it('adds activity-specific terms', () => {
    const keywords = activitySeoKeywords({
      locale: 'en',
      title: 'Tea Meditation',
      displayName: 'Xindeng Academy',
      city: 'Chiang Mai',
      categoryName: 'Tea gathering',
    })
    expect(keywords).toContain('Tea Meditation booking')
    expect(keywords).toContain('Tea gathering')
  })

  it('does not leak Thailand network keywords onto an independent location', () => {
    const keywords = locationSeoKeywords(
      'zh-CN',
      '越南北宁',
      '善明小院',
      [],
      false,
    )

    expect(keywords).toContain('越南北宁禅修')
    expect(keywords).not.toContain('静心学堂 · 泰国')
    expect(keywords).not.toContain('曼谷禅修')
  })
})
