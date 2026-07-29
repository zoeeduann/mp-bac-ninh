import { describe, expect, it } from 'vitest'
import { getTopicPage, TOPIC_PAGES, topicPath, topicText } from '@/lib/topic-pages'

describe('topic pages', () => {
  it('defines the SEO topic landing pages with stable paths', () => {
    expect(TOPIC_PAGES).toHaveLength(6)
    expect(TOPIC_PAGES.map((topic) => topic.slug)).toContain('zen-meditation-bangkok')
    expect(topicPath('buddhism-thailand')).toBe('/topics/buddhism-thailand')
  })

  it('returns localized title and keywords for a topic', () => {
    const topic = getTopicPage('meditation-chiangmai')
    expect(topic).toBeTruthy()
    expect(topicText(topic!.title, 'zh-CN')).toContain('清迈')
    expect(topic!.keywords.en).toContain('meditation Chiang Mai')
  })
})
