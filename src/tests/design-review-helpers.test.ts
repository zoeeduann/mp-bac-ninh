import { describe, expect, it } from 'vitest'
import { activityExcerpt, stripExcerptNoise } from '@/lib/activity-text'
import {
  hasUsableSlug,
  nextUpcomingStart,
  splitUpcomingPast,
  withUsableSlugs,
} from '@/lib/activity-list'
import { pageTitle, splitPlaceName, withCountry } from '@/lib/page-title'
import { remainingSeatsText } from '@/lib/seats'
import { contactChannels, zaloHref } from '@/lib/contact'
import { bacNinhSignature } from '@/lib/bac-ninh-copy'

describe('activityExcerpt', () => {
  it('strips emoji and leading label noise', () => {
    expect(stripExcerptNoise('🍵✨【活动简介】：一盏清茶，一轮明月')).toBe('一盏清茶，一轮明月')
    expect(activityExcerpt('📍 Description: A quiet tea 🍃 evening', 'Tea')).toBe(
      'A quiet tea evening',
    )
  })

  it('keeps real sentences that merely start with a label word', () => {
    expect(activityExcerpt('介绍一种把健康握在手里的方法', '按导')).toBe('介绍一种把健康握在手里的方法')
  })

  it('omits an excerpt that equals or repeats the title', () => {
    expect(activityExcerpt('正念为食', '正念为食')).toBeNull()
    expect(activityExcerpt('  正念为食 🍚 ', '正念为食')).toBeNull()
    expect(activityExcerpt('Mindfulness in Eating', 'Mindfulness in Eating')).toBeNull()
    expect(activityExcerpt('', 'x')).toBeNull()
    expect(activityExcerpt(null, 'x')).toBeNull()
  })

  it('drops a repeated title prefix but keeps the rest', () => {
    expect(activityExcerpt('正念球：禅意运动，健康养生', '正念球')).toBe('禅意运动，健康养生')
  })

  it('collapses line breaks into one line for line-clamp', () => {
    expect(activityExcerpt('我们常常把“这就是命”挂在嘴边。\n但命运，究竟由谁决定？', '读书会')).toBe(
      '我们常常把“这就是命”挂在嘴边。 但命运，究竟由谁决定？',
    )
  })
})

describe('activity list helpers', () => {
  const now = new Date('2026-09-18T00:00:00Z')
  const act = (slug: string, starts: string[], status?: string) => ({
    slug,
    occurrences: starts.map((startAt) => ({ startAt, status })),
  })

  it('treats blank slugs as unusable', () => {
    expect(hasUsableSlug({ slug: '  ' })).toBe(false)
    expect(hasUsableSlug({ slug: '' })).toBe(false)
    expect(hasUsableSlug({ slug: null })).toBe(false)
    expect(hasUsableSlug({ slug: 'mindfulness-ball' })).toBe(true)
    expect(withUsableSlugs([{ slug: '  ' }, { slug: 'a' }])).toEqual([{ slug: 'a' }])
  })

  it('splits upcoming (soonest first) from past (latest first) and drops blank slugs', () => {
    const { upcoming, past } = splitUpcomingPast(
      [
        act('late', ['2026-09-25T00:00:00Z']),
        act('old', ['2026-08-01T00:00:00Z']),
        act('soon', ['2026-09-19T00:00:00Z']),
        act('recent', ['2026-09-10T00:00:00Z']),
        act('  ', ['2026-09-20T00:00:00Z']),
        act('none', []),
        act('cancelled', ['2026-09-30T00:00:00Z'], 'cancelled'),
      ],
      now,
    )
    expect(upcoming.map((a) => a.slug)).toEqual(['soon', 'late'])
    expect(past.map((a) => a.slug)).toEqual(['recent', 'old', 'none', 'cancelled'])
  })

  it('finds the next live session only', () => {
    expect(
      nextUpcomingStart(
        {
          occurrences: [
            { startAt: '2026-09-20T00:00:00Z', status: 'cancelled' },
            { startAt: '2026-09-22T00:00:00Z' },
            { startAt: '2026-09-01T00:00:00Z' },
          ],
        },
        now,
      ),
    ).toBe('2026-09-22T00:00:00Z')
  })
})

describe('pageTitle', () => {
  it('uses the full-width bar in Chinese and a spaced bar in English', () => {
    expect(pageTitle('zh-CN', '学堂笔记', '善明小院')).toBe('学堂笔记｜善明小院')
    expect(pageTitle('en', 'Journal', 'Thien Minh Courtyard')).toBe('Journal | Thien Minh Courtyard')
    expect(pageTitle('en', 'Activities', '', null)).toBe('Activities')
    expect(pageTitle('zh-CN', 'a', 'b')).not.toContain('—')
  })

  it('splits a CMS place name at " · " and dedupes the country', () => {
    expect(splitPlaceName('Thien Minh Courtyard · Bac Ninh, Vietnam')).toEqual({
      primary: 'Thien Minh Courtyard',
      secondary: 'Bac Ninh, Vietnam',
    })
    expect(splitPlaceName('越南北宁善明小院')).toEqual({ primary: '越南北宁善明小院', secondary: null })
    expect(withCountry('Bac Ninh, Vietnam', 'Vietnam')).toBe('Bac Ninh, Vietnam')
    expect(withCountry('Bac Ninh', 'Vietnam')).toBe('Bac Ninh · Vietnam')
  })
})

describe('remainingSeatsText', () => {
  it('shows remaining seats instead of an occupied ratio', () => {
    expect(remainingSeatsText('zh-CN', 6)).toBe('剩余 6 个名额')
    expect(remainingSeatsText('en', 6)).toBe('6 spots left')
    expect(remainingSeatsText('en', 1)).toBe('1 spot left')
    expect(remainingSeatsText('zh-CN', 0)).toBe('已满')
    expect(remainingSeatsText('en', -2)).toBe('Full')
  })
})

describe('contactChannels', () => {
  it('returns only real values, as tappable links', () => {
    const channels = contactChannels(
      {
        phone: '+84 91 111 1111',
        whatsapp: '+84 91 111 1111',
        email: 'bn@example.com',
        wechatId: '',
        social: [
          { label: 'Facebook', url: 'https://www.facebook.com/mindfulpeaceshanming' },
          { label: 'Zalo', url: '0912 345 678' },
          { label: 'Broken', url: '#' },
        ],
      },
      'vi',
    )
    expect(channels.map((c) => c.method)).toEqual(['phone', 'whatsapp', 'facebook', 'zalo', 'email'])
    expect(channels[0]).toMatchObject({ label: 'Điện thoại', href: 'tel:+84911111111' })
    expect(channels[1].href).toBe('https://wa.me/84911111111')
    expect(channels[3]).toMatchObject({ href: 'https://zalo.me/0912345678', value: '0912 345 678' })
    expect(channels[4].href).toBe('mailto:bn@example.com')
  })

  it('never invents a WeChat ID and returns nothing when nothing is set', () => {
    expect(contactChannels({ wechatId: '  ', social: [] }, 'zh-CN')).toEqual([])
    expect(zaloHref('123')).toBeNull()
  })
})

describe('bacNinhSignature', () => {
  it('does not repeat the CMS phrase in Chinese', () => {
    const line = bacNinhSignature('zh-CN', '越南北宁的修学空间。越南北宁的修学空间。禅意生活、智慧人生、觉醒之道。')
    expect(line).toBe('越南北宁的修学空间。禅意生活、智慧人生、觉醒之道。')
    expect(line).not.toContain('—')
  })

  it('ignores a Chinese fallback value on English pages', () => {
    expect(bacNinhSignature('en', '越南北宁的修学空间。禅意生活、智慧人生、觉醒之道。')).toBe(
      'Chan-inspired living, wisdom in life, and the path to awakening.',
    )
    expect(bacNinhSignature('en', null)).toMatch(/^Chan-inspired/)
    expect(bacNinhSignature('zh-CN', '')).toBe('禅意生活、智慧人生、觉醒之道。')
  })
})
