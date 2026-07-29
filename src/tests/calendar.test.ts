import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  buildMonthGrid,
  buildTwoWeekGrid,
  groupOccurrencesByDay,
  formatYMD,
  parseMonthParam,
  parseWeekStartParam,
  isSessionPast,
  mondayOfWeek,
} from '@/lib/calendar'

// ─── buildMonthGrid ────────────────────────────────────────────────────────

describe('buildMonthGrid()', () => {
  // May 2026: May 1 is a Friday (day 5 in JS, weekday index Mon=0 → Fri=4)
  // Monday-first grid: first cell = Mon April 27
  const grid = buildMonthGrid(2026, 4 /* May = month0 4 */)

  it('returns 6 rows of 7 cells', () => {
    expect(grid).toHaveLength(6)
    for (const row of grid) {
      expect(row).toHaveLength(7)
    }
  })

  it('first cell is Monday April 27 for May 2026', () => {
    const cell = grid[0][0]
    expect(cell.day).toBe(27)
    expect(cell.isCurrentMonth).toBe(false)
    expect(cell.date.getMonth()).toBe(3) // April = month 3
  })

  it('first day of month (May 1) is on correct weekday column (Friday = index 4)', () => {
    // Row 0, col 4 should be May 1
    const cell = grid[0][4]
    expect(cell.day).toBe(1)
    expect(cell.isCurrentMonth).toBe(true)
  })

  it('marks today correctly', () => {
    // Use a fixed today = 2026-05-13 (a Wednesday → row 1, col 2)
    const today = new Date('2026-05-13T00:00:00+07:00') // Bangkok midnight
    const g = buildMonthGrid(2026, 4, today)
    const todayCells = g.flat().filter((c) => c.isToday)
    expect(todayCells).toHaveLength(1)
    expect(todayCells[0].day).toBe(13)
    expect(todayCells[0].isCurrentMonth).toBe(true)
  })

  it('cells from other months are not isCurrentMonth', () => {
    const flat = grid.flat()
    const others = flat.filter((c) => !c.isCurrentMonth)
    // April tail: 27,28,29,30 (4 cells) + June head: 1,2,3,4,5,6,7 (7 cells) = 11
    expect(others.length).toBeGreaterThanOrEqual(4)
    for (const c of others) {
      expect(c.date.getMonth()).not.toBe(4)
    }
  })

  it('covers all 31 days of May', () => {
    const may = grid.flat().filter((c) => c.isCurrentMonth)
    expect(may.map((c) => c.day).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 31 }, (_, i) => i + 1),
    )
  })

  it('no isToday cells when today is outside the month range', () => {
    const today = new Date('2025-01-01T00:00:00Z')
    const g = buildMonthGrid(2026, 4, today)
    const todayCells = g.flat().filter((c) => c.isToday)
    expect(todayCells).toHaveLength(0)
  })

  it('Bangkok timezone: UTC 2026-05-12 23:30 is ICT 2026-05-13 06:30 → May 13 cell isToday', () => {
    // UTC 2026-05-12 23:30 = ICT 2026-05-13 06:30 (different calendar dates)
    // The cell for May 13 should have isToday === true when system time is this UTC moment
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12T23:30:00.000Z'))
    try {
      const g = buildMonthGrid(2026, 4) // uses new Date() internally
      const flat = g.flat()
      const todayCells = flat.filter((c) => c.isToday)
      expect(todayCells).toHaveLength(1)
      expect(todayCells[0].day).toBe(13)
      expect(todayCells[0].isCurrentMonth).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

// ─── groupOccurrencesByDay ─────────────────────────────────────────────────

describe('groupOccurrencesByDay()', () => {
  it('groups occurrences by Bangkok date string', () => {
    const acts = [
      {
        slug: 'med',
        title: '禅修课',
        category: { slug: 'meditation' },
        occurrences: [
          { id: 'o1', startAt: '2026-05-26T02:00:00.000Z', status: 'open' }, // 09:00 ICT
        ],
      },
    ]
    const map = groupOccurrencesByDay(acts)
    expect(map.has('2026-05-26')).toBe(true)
    const chips = map.get('2026-05-26')!
    expect(chips).toHaveLength(1)
    expect(chips[0].activitySlug).toBe('med')
    expect(chips[0].categorySlug).toBe('meditation')
  })

  it('skips cancelled and deleted occurrences', () => {
    const acts = [
      {
        slug: 'act',
        title: 'Act',
        category: { slug: 'cat' },
        occurrences: [
          { id: 'c1', startAt: '2026-05-26T02:00:00.000Z', status: 'cancelled' },
          { id: 'd1', startAt: '2026-05-26T02:00:00.000Z', status: 'deleted' },
        ],
      },
    ]
    const map = groupOccurrencesByDay(acts)
    expect(map.size).toBe(0)
  })

  it('groups multiple activities on the same day', () => {
    const acts = [
      {
        slug: 'a1',
        title: 'A1',
        category: { slug: 'cat1' },
        occurrences: [{ id: 'o1', startAt: '2026-05-26T02:00:00.000Z', status: 'open' }],
      },
      {
        slug: 'a2',
        title: 'A2',
        category: { slug: 'cat2' },
        occurrences: [{ id: 'o2', startAt: '2026-05-26T08:00:00.000Z', status: 'open' }],
      },
    ]
    const map = groupOccurrencesByDay(acts)
    expect(map.get('2026-05-26')).toHaveLength(2)
  })

  it('handles activities without occurrences', () => {
    const acts = [
      { slug: 'empty', title: 'Empty', category: { slug: 'cat' }, occurrences: [] },
    ]
    const map = groupOccurrencesByDay(acts)
    expect(map.size).toBe(0)
  })
})

// ─── buildTwoWeekGrid ──────────────────────────────────────────────────────

describe('buildTwoWeekGrid()', () => {
  const today = new Date('2026-06-10T08:00:00+07:00') // Bangkok Wednesday
  const monday = new Date('2026-06-08T00:00:00+07:00') // a Monday at 00:00 BKK
  const grid = buildTwoWeekGrid(monday, today)

  it('returns 2 rows of 7 cells (14 days total)', () => {
    expect(grid).toHaveLength(2)
    for (const row of grid) expect(row).toHaveLength(7)
  })

  it('first cell is the start date', () => {
    expect(grid[0][0].day).toBe(8)
  })

  it('last cell is start + 13 days', () => {
    expect(grid[1][6].day).toBe(21)
  })

  it('marks today correctly when today is inside the window', () => {
    const todayCells = grid.flat().filter((c) => c.isToday)
    expect(todayCells).toHaveLength(1)
    expect(todayCells[0].day).toBe(10)
  })

  it('marks nothing as today when today is outside the window', () => {
    const farFuture = new Date('2027-01-01T08:00:00+07:00')
    const g = buildTwoWeekGrid(monday, farFuture)
    expect(g.flat().filter((c) => c.isToday)).toHaveLength(0)
  })

  it('crosses a month boundary cleanly: late-July start spans into August', () => {
    const start = new Date('2026-07-27T00:00:00+07:00') // Monday
    const g = buildTwoWeekGrid(start, today)
    const days = g.flat().map((c) => c.day)
    // Last week of July (27-31) then first week of August (1-9)
    expect(days).toEqual([27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

// ─── mondayOfWeek ──────────────────────────────────────────────────────────

describe('mondayOfWeek()', () => {
  it('returns the same date when given a Monday', () => {
    const mon = new Date('2026-06-08T08:00:00+07:00') // Monday
    const result = mondayOfWeek(mon)
    expect(formatYMD(result)).toBe('2026-06-08')
  })

  it('walks back to Monday from a Wednesday', () => {
    const wed = new Date('2026-06-10T08:00:00+07:00')
    expect(formatYMD(mondayOfWeek(wed))).toBe('2026-06-08')
  })

  it('walks back to Monday from a Sunday (week ends Sunday in our convention)', () => {
    const sun = new Date('2026-06-14T08:00:00+07:00') // Sunday
    expect(formatYMD(mondayOfWeek(sun))).toBe('2026-06-08')
  })

  it('returns local Monday (Bangkok TZ) when UTC midnight is actually Sunday BKK', () => {
    // UTC 2026-06-14 17:00 = ICT 2026-06-15 00:00 (Monday)
    const d = new Date('2026-06-14T17:00:00.000Z')
    expect(formatYMD(mondayOfWeek(d))).toBe('2026-06-15')
  })

  it('result is anchored at UTC midnight (host-TZ independent, regression)', () => {
    // The bug: a previous impl returned `new Date('YYYY-MM-DDT00:00:00+07:00')`,
    // which on a UTC host (Vercel functions) is 17:00 the PREVIOUS day in UTC.
    // formatYMD (which uses host-local getDate) then produced an off-by-one
    // YMD key, so clicking June 6 in the mobile calendar pulled up June 5's
    // activities. Asserting against getUTC* makes this regression detectable
    // regardless of the test host's local TZ.
    const wed = new Date('2026-06-10T08:00:00+07:00')
    const m = mondayOfWeek(wed)
    expect(m.getUTCFullYear()).toBe(2026)
    expect(m.getUTCMonth()).toBe(5) // June (0-indexed)
    expect(m.getUTCDate()).toBe(8)
    expect(m.getUTCHours()).toBe(0)
  })
})

// ─── parseWeekStartParam ────────────────────────────────────────────────────

describe('parseWeekStartParam()', () => {
  it('parses a valid YYYY-MM-DD string into a Date', () => {
    const d = parseWeekStartParam('2026-06-08')
    expect(d).not.toBeNull()
    expect(formatYMD(d!)).toBe('2026-06-08')
  })

  it('returns null for malformed input', () => {
    expect(parseWeekStartParam('2026-6-8')).toBeNull()
    expect(parseWeekStartParam('bad')).toBeNull()
    expect(parseWeekStartParam('')).toBeNull()
  })

  it('returns null for impossible date (Feb 30)', () => {
    expect(parseWeekStartParam('2026-02-30')).toBeNull()
  })

  it('parsed Date is anchored at UTC midnight (host-TZ independent, regression)', () => {
    const d = parseWeekStartParam('2026-06-08')
    expect(d).not.toBeNull()
    expect(d!.getUTCFullYear()).toBe(2026)
    expect(d!.getUTCMonth()).toBe(5)
    expect(d!.getUTCDate()).toBe(8)
    expect(d!.getUTCHours()).toBe(0)
  })
})

// ─── isSessionPast ──────────────────────────────────────────────────────────

describe('isSessionPast()', () => {
  const now = new Date('2026-05-29T14:50:00.000Z') // ICT 2026-05-29 21:50

  it('returns true when the session started before now', () => {
    // 2026-05-29 02:30 UTC (09:30 ICT) — this morning
    expect(isSessionPast('2026-05-29T02:30:00.000Z', now)).toBe(true)
  })

  it('returns false when the session starts in the future', () => {
    // 2026-06-09 02:00 UTC (09:00 ICT) — later
    expect(isSessionPast('2026-06-09T02:00:00.000Z', now)).toBe(false)
  })

  it('returns true when the session starts exactly at now (cutoff is inclusive)', () => {
    expect(isSessionPast('2026-05-29T14:50:00.000Z', now)).toBe(true)
  })

  it('accepts a Date as well as an ISO string', () => {
    expect(isSessionPast(new Date('2026-05-29T02:30:00.000Z'), now)).toBe(true)
    expect(isSessionPast(new Date('2026-06-09T02:00:00.000Z'), now)).toBe(false)
  })
})

// ─── formatYMD ────────────────────────────────────────────────────────────

describe('formatYMD()', () => {
  it('formats single-digit months and days with zero-padding', () => {
    expect(formatYMD(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('formats December 31', () => {
    expect(formatYMD(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

// ─── parseMonthParam ──────────────────────────────────────────────────────

describe('parseMonthParam()', () => {
  it('parses valid param', () => {
    expect(parseMonthParam('2026-05')).toEqual({ year: 2026, month0: 4 })
  })

  it('returns null for invalid format', () => {
    expect(parseMonthParam('2026-5')).toBeNull()
    expect(parseMonthParam('26-05')).toBeNull()
    expect(parseMonthParam('bad')).toBeNull()
  })

  it('returns null for out-of-range month', () => {
    expect(parseMonthParam('2026-00')).toBeNull()
    expect(parseMonthParam('2026-13')).toBeNull()
  })
})
