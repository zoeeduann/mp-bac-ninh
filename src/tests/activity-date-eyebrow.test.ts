import { describe, expect, it } from 'vitest'
import { activityDateEyebrow } from '@/lib/activity-list'

describe('activityDateEyebrow', () => {
  const now = new Date('2026-10-19T14:45:00Z') // Mon 21:45 ICT
  // Wednesdays 13:00 ICT
  const weekly = {
    occurrences: [
      { startAt: '2026-10-14T06:00:00.000Z', status: 'open' },
      { startAt: '2026-10-21T06:00:00.000Z', status: 'open' },
      { startAt: '2026-10-28T06:00:00.000Z', status: 'open' },
      { startAt: '2026-11-04T06:00:00.000Z', status: 'open' },
    ],
  }

  it('labels a weekly activity with its weekday, time and next date', () => {
    expect(activityDateEyebrow(weekly, 'zh-CN', now)).toEqual({ label: '每周三 13:00 ICT', note: '下一场 10月21日' })
    expect(activityDateEyebrow(weekly, 'en', now)).toEqual({ label: 'EVERY WED 13:00 ICT', note: 'Next Oct 21' })
  })

  it('keeps the weekly label when one week is cancelled', () => {
    const withCancelled = {
      occurrences: weekly.occurrences.map((o, i) => (i === 1 ? { ...o, status: 'cancelled' } : o)),
    }
    expect(activityDateEyebrow(withCancelled, 'zh-CN', now)).toEqual({ label: '每周三 13:00 ICT', note: '下一场 10月28日' })
  })

  it('ignores deleted sessions', () => {
    const withDeleted = {
      occurrences: [...weekly.occurrences, { startAt: '2026-10-23T06:00:00.000Z', status: 'deleted' }],
    }
    expect(activityDateEyebrow(withDeleted, 'zh-CN', now)).toEqual({ label: '每周三 13:00 ICT', note: '下一场 10月21日' })
  })

  it('lists several weekdays in week order', () => {
    // Tue + Thu 09:30 ICT
    const activity = {
      occurrences: [
        '2026-10-20T02:30:00.000Z',
        '2026-10-22T02:30:00.000Z',
        '2026-10-27T02:30:00.000Z',
        '2026-10-29T02:30:00.000Z',
      ].map((startAt) => ({ startAt, status: 'open' })),
    }
    expect(activityDateEyebrow(activity, 'zh-CN', now)).toEqual({ label: '每周二、四 09:30 ICT', note: '下一场 10月20日' })
    expect(activityDateEyebrow(activity, 'en', now)).toEqual({ label: 'EVERY TUE & THU 09:30 ICT', note: 'Next Oct 20' })
  })

  it('falls back to the next session date when there is no weekly pattern', () => {
    const single = { occurrences: [{ startAt: '2026-10-25T08:00:00.000Z', status: 'open' }] }
    expect(activityDateEyebrow(single, 'zh-CN', now)).toEqual({ label: '10月 25日 · 15:00 ICT', note: null })
    const differentTimes = {
      occurrences: [
        { startAt: '2026-10-21T06:00:00.000Z', status: 'open' },
        { startAt: '2026-10-28T07:00:00.000Z', status: 'open' },
      ],
    }
    expect(activityDateEyebrow(differentTimes, 'zh-CN', now)).toEqual({ label: '10月 21日 · 13:00 ICT', note: null })
    const twoWeeksApart = {
      occurrences: [
        { startAt: '2026-10-21T06:00:00.000Z', status: 'open' },
        { startAt: '2026-11-04T06:00:00.000Z', status: 'open' },
      ],
    }
    expect(activityDateEyebrow(twoWeeksApart, 'zh-CN', now)).toEqual({ label: '10月 21日 · 13:00 ICT', note: null })
  })

  it('returns null when nothing is coming up', () => {
    expect(activityDateEyebrow({ occurrences: [] }, 'zh-CN', now)).toBeNull()
  })
})
