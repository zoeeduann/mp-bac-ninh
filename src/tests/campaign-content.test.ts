import { describe, expect, it } from 'vitest'
import type { Activity } from '@/payload-types'
import { campaignExamples } from '@/lib/campaign-content'
import { campaignInquiryNotes, normalizeZaloPhone } from '@/lib/campaigns'

it('normalizes contact numbers without inventing an extra phone number', () => {
  expect(normalizeZaloPhone('+84 912-345-678')).toBe('+84912345678')
  expect(normalizeZaloPhone('0912 345 678')).toBe('0912345678')
  expect(normalizeZaloPhone('abc0912345678')).toBeNull()
  expect(normalizeZaloPhone('123')).toBeNull()
})

it('keeps only bounded first-party campaign attribution, not arbitrary query/contact fields', () => {
  const notes = campaignInquiryNotes(
    'buddhism',
    '?utm_source=google&utm_content=creative-a&email=private@example.com&gclid=123&utm_term=religion',
  )
  expect(notes).toContain('utm_content: creative-a')
  expect(notes).not.toContain('private@example.com')
  expect(notes).not.toContain('gclid')
  expect(notes).not.toContain('utm_term')
})

describe('activity examples', () => {
  const course = {
    id: 58,
    status: 'published',
    slug: 'tea-ceremony-seven-forms-training',
    registrationMode: 'series',
    occurrences: [
      { startAt: '2026-08-23T02:00:00Z', status: 'open' },
      { startAt: '2026-09-05T02:00:00Z', status: 'open' },
    ],
  } as Activity
  it('does not present a started series as a new enrollment', () => {
    expect(campaignExamples([course], 'mindfulness', Date.parse('2026-08-31'))[0].state).toBe(
      '系列进行中 · 新一期请咨询',
    )
  })
  it('does not advertise cancelled future dates or drafts', () => {
    const cancelled = {
      ...course,
      occurrences: [{ startAt: '2026-09-05T02:00:00Z', status: 'cancelled' }],
    } as Activity
    expect(
      campaignExamples([cancelled], 'mindfulness', Date.parse('2026-08-31'))[0].state,
    ).toContain('往期活动')
    expect(campaignExamples([{ ...course, status: 'draft' } as Activity], 'mindfulness')).toEqual(
      [],
    )
  })
})
