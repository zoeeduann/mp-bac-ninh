import { describe, expect, it } from 'vitest'
import { findNextSession } from '@/lib/content'

describe('findNextSession()', () => {
  const futureISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const pastISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const nearISO = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()

  it('returns null for empty activities list', () => {
    expect(findNextSession([])).toBeNull()
  })

  it('returns null when no future occurrences', () => {
    const acts = [
      {
        title: 'Meditation',
        slug: 'meditation',
        occurrences: [{ startAt: pastISO, status: 'open' }],
      },
    ]
    expect(findNextSession(acts)).toBeNull()
  })

  it('returns the nearest future occurrence', () => {
    const acts = [
      {
        title: 'Late Session',
        slug: 'late',
        occurrences: [{ startAt: futureISO, status: 'open' }],
      },
      {
        title: 'Near Session',
        slug: 'near',
        occurrences: [{ startAt: nearISO, status: 'open' }],
      },
    ]
    const result = findNextSession(acts)
    expect(result?.activitySlug).toBe('near')
  })

  it('skips cancelled occurrences', () => {
    const acts = [
      {
        title: 'Cancelled',
        slug: 'cancelled-act',
        occurrences: [{ startAt: nearISO, status: 'cancelled' }],
      },
      {
        title: 'Open',
        slug: 'open-act',
        occurrences: [{ startAt: futureISO, status: 'open' }],
      },
    ]
    const result = findNextSession(acts)
    expect(result?.activitySlug).toBe('open-act')
  })

  it('skips deleted occurrences', () => {
    const acts = [
      {
        title: 'Deleted',
        slug: 'deleted-act',
        occurrences: [{ startAt: nearISO, status: 'deleted' }],
      },
    ]
    expect(findNextSession(acts)).toBeNull()
  })

  it('returns correct shape', () => {
    const acts = [
      {
        title: 'Morning Sit',
        slug: 'morning-sit',
        occurrences: [{ startAt: nearISO, status: 'open' }],
      },
    ]
    const result = findNextSession(acts)
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('startAt')
    expect(result).toHaveProperty('activityTitle', 'Morning Sit')
    expect(result).toHaveProperty('activitySlug', 'morning-sit')
  })
})
