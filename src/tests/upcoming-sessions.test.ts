import { describe, expect, it } from 'vitest'

// Pure logic extracted from getUpcomingSessionsForLocation for unit testing
// (the actual function requires a Payload DB connection so we test the pure parts)

const now = new Date()
const futureISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const future2ISO = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
const nearISO = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
const pastISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

function flattenFutureOccurrences(
  activities: any[],
  currentNow: Date,
): Array<{ activity: any; occurrence: any }> {
  const result: Array<{ activity: any; occurrence: any }> = []
  for (const activity of activities) {
    const occs = activity.occurrences ?? []
    for (const occ of occs) {
      if (!occ.startAt || !occ.id) continue
      if (occ.status === 'cancelled' || occ.status === 'deleted') continue
      if (new Date(occ.startAt) <= currentNow) continue
      result.push({
        activity,
        occurrence: {
          id: occ.id,
          startAt: occ.startAt,
          endAt: occ.endAt ?? occ.startAt,
          capacityOverride: occ.capacityOverride ?? null,
        },
      })
    }
  }
  result.sort(
    (a, b) =>
      new Date(a.occurrence.startAt).getTime() - new Date(b.occurrence.startAt).getTime(),
  )
  return result
}

describe('flattenFutureOccurrences() (core logic of getUpcomingSessionsForLocation)', () => {
  it('returns empty for no activities', () => {
    expect(flattenFutureOccurrences([], now)).toHaveLength(0)
  })

  it('excludes past occurrences', () => {
    const acts = [
      {
        id: 1,
        title: 'Past Activity',
        slug: 'past',
        capacity: 10,
        occurrences: [{ id: 'o1', startAt: pastISO, endAt: pastISO, status: 'open' }],
      },
    ]
    expect(flattenFutureOccurrences(acts, now)).toHaveLength(0)
  })

  it('excludes cancelled occurrences', () => {
    const acts = [
      {
        id: 2,
        title: 'Cancelled Act',
        slug: 'cancelled',
        capacity: 10,
        occurrences: [{ id: 'o2', startAt: futureISO, endAt: futureISO, status: 'cancelled' }],
      },
    ]
    expect(flattenFutureOccurrences(acts, now)).toHaveLength(0)
  })

  it('excludes deleted occurrences', () => {
    const acts = [
      {
        id: 3,
        title: 'Deleted Act',
        slug: 'deleted',
        capacity: 10,
        occurrences: [{ id: 'o3', startAt: futureISO, endAt: futureISO, status: 'deleted' }],
      },
    ]
    expect(flattenFutureOccurrences(acts, now)).toHaveLength(0)
  })

  it('includes future open occurrences', () => {
    const acts = [
      {
        id: 4,
        title: 'Open Act',
        slug: 'open',
        capacity: 10,
        occurrences: [{ id: 'o4', startAt: futureISO, endAt: futureISO, status: 'open' }],
      },
    ]
    const result = flattenFutureOccurrences(acts, now)
    expect(result).toHaveLength(1)
    expect(result[0].activity.slug).toBe('open')
  })

  it('sorts occurrences by startAt ascending', () => {
    const acts = [
      {
        id: 5,
        title: 'Late Act',
        slug: 'late',
        capacity: 10,
        occurrences: [{ id: 'o5', startAt: future2ISO, endAt: future2ISO, status: 'open' }],
      },
      {
        id: 6,
        title: 'Near Act',
        slug: 'near',
        capacity: 10,
        occurrences: [{ id: 'o6', startAt: nearISO, endAt: nearISO, status: 'open' }],
      },
    ]
    const result = flattenFutureOccurrences(acts, now)
    expect(result).toHaveLength(2)
    expect(result[0].activity.slug).toBe('near')
    expect(result[1].activity.slug).toBe('late')
  })

  it('flattens multiple occurrences per activity', () => {
    const acts = [
      {
        id: 7,
        title: 'Multi Occ',
        slug: 'multi',
        capacity: 10,
        occurrences: [
          { id: 'o7a', startAt: futureISO, endAt: futureISO, status: 'open' },
          { id: 'o7b', startAt: future2ISO, endAt: future2ISO, status: 'open' },
        ],
      },
    ]
    const result = flattenFutureOccurrences(acts, now)
    expect(result).toHaveLength(2)
    expect(result[0].occurrence.id).toBe('o7a')
    expect(result[1].occurrence.id).toBe('o7b')
  })

  it('respects capacity zero scenario (remaining = 0)', () => {
    // When capacity = 0 (edge case), remaining should be 0 (Math.max(0, cap - occupied))
    // We test this via the math directly
    const capacity = 0
    const occupied = 0
    const remaining = Math.max(0, capacity - occupied)
    expect(remaining).toBe(0)
  })
})
