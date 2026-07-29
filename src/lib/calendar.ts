/**
 * calendar.ts — pure helpers for the calendar view on the Activities page.
 *
 * All date comparisons use Asia/Bangkok (ICT, UTC+7) so that activity start
 * times stored as UTC in the DB map to the correct local calendar day.
 */
import { toZonedTime } from 'date-fns-tz'

export const TZ = 'Asia/Bangkok'

export interface CalendarCell {
  /** Local (Bangkok-timezone) date object */
  date: Date
  /** Day-of-month number */
  day: number
  /** True if this cell belongs to `month0` */
  isCurrentMonth: boolean
  /** True if this cell is today (compared to `today` param) */
  isToday: boolean
}

/**
 * Build a 6×7 Monday-first calendar grid for the given year + zero-based month.
 *
 * @param year   - full year (e.g. 2026)
 * @param month0 - zero-based month (0 = January)
 * @param today  - reference date for `isToday`; defaults to `new Date()`
 */
export function buildMonthGrid(
  year: number,
  month0: number,
  today: Date = new Date(),
): CalendarCell[][] {
  // Anchor every cell at UTC midnight of the target day so the grid is
  // identical regardless of host TZ. The previous `new Date(year, m, d)`
  // form was host-local, which on Asia/Shanghai or further-east boxes
  // pulled cell days backward when re-zoned to BKK (off-by-one error
  // visible in production whenever an editor / dev TZ was east of BKK).
  const firstOfMonth = new Date(Date.UTC(year, month0, 1, 0, 0, 0))
  // Monday-first: Sunday (0) → 6, Monday (1) → 0, …, Saturday (6) → 5
  const firstDayWeekday = (firstOfMonth.getUTCDay() + 6) % 7

  // Normalise `today` to a date-string in Bangkok time
  const todayZoned = toZonedTime(today, TZ)
  const todayStr = `${todayZoned.getFullYear()}-${todayZoned.getMonth()}-${todayZoned.getDate()}`

  const grid: CalendarCell[][] = []
  for (let r = 0; r < 6; r++) {
    const row: CalendarCell[] = []
    for (let c = 0; c < 7; c++) {
      // UTC midnight on the cell's day — host-TZ-independent. BKK is +7,
      // so this UTC moment is still the same calendar date in BKK.
      const d = new Date(
        Date.UTC(year, month0, 1 - firstDayWeekday + r * 7 + c, 0, 0, 0),
      )
      const cellYear = d.getUTCFullYear()
      const cellMonth = d.getUTCMonth()
      const cellDay = d.getUTCDate()
      const dStr = `${cellYear}-${cellMonth}-${cellDay}`

      row.push({
        date: d,
        day: cellDay,
        isCurrentMonth: cellMonth === month0,
        isToday: dStr === todayStr,
      })
    }
    grid.push(row)
  }
  return grid
}

export interface OccurrenceChip {
  activitySlug: string
  activityTitle: string
  categorySlug: string
  occurrenceId: string
  startAt: string
}

/**
 * Group occurrence chips by Bangkok-timezone date string "YYYY-MM-DD".
 *
 * @param activities - array of activity docs (with occurrences + category populated)
 */
export function groupOccurrencesByDay(
  activities: any[],
): Map<string, OccurrenceChip[]> {
  const map = new Map<string, OccurrenceChip[]>()

  for (const act of activities) {
    const occs: any[] = act.occurrences ?? []
    for (const occ of occs) {
      if (!occ.startAt) continue
      if (occ.status === 'cancelled' || occ.status === 'deleted') continue

      const zonedDate = toZonedTime(new Date(occ.startAt), TZ)
      const key = formatYMD(zonedDate)

      const chip: OccurrenceChip = {
        activitySlug: act.slug ?? '',
        activityTitle: typeof act.title === 'string' ? act.title : '',
        categorySlug:
          typeof act.category === 'object'
            ? (act.category?.slug ?? '')
            : '',
        occurrenceId: occ.id ?? '',
        startAt: occ.startAt,
      }

      const existing = map.get(key)
      if (existing) {
        existing.push(chip)
      } else {
        map.set(key, [chip])
      }
    }
  }

  return map
}

/**
 * Whether a session's start instant is at or before `now` — i.e. it has already
 * started and is no longer bookable.
 *
 * This is the single source of truth for "can this session still be booked?",
 * shared by the calendar (which hides the book button for past sessions) and
 * the booking page (which only lists/auto-opens future sessions). Keeping both
 * on the same cutoff prevents the "shows a Book button but the form never
 * opens" inconsistency. The cutoff is inclusive: a session starting exactly at
 * `now` counts as past.
 */
export function isSessionPast(startAt: string | Date, now: Date): boolean {
  return new Date(startAt).getTime() <= now.getTime()
}

/**
 * Two-row × 7-column grid starting from `startDate`. Used by the mobile
 * calendar view, which trades the full-month view for taller cells that fit
 * activity names alongside each day number. Same `CalendarCell` shape as
 * `buildMonthGrid` so the renderer can share logic; `isCurrentMonth` is
 * computed relative to the start date's month (so cells that cross a month
 * boundary dim consistently with the desktop view).
 */
export function buildTwoWeekGrid(
  startDate: Date,
  today: Date = new Date(),
): CalendarCell[][] {
  const todayZoned = toZonedTime(today, TZ)
  const todayStr = `${todayZoned.getFullYear()}-${todayZoned.getMonth()}-${todayZoned.getDate()}`

  // Anchor on the BKK calendar day of `startDate` regardless of how it was
  // constructed (mondayOfWeek returns UTC midnight, parseWeekStartParam
  // returns UTC midnight, but a caller could pass an arbitrary moment).
  const startZoned = toZonedTime(startDate, TZ)
  const baseYear = startZoned.getFullYear()
  const baseMonth = startZoned.getMonth()
  const baseDay = startZoned.getDate()

  const grid: CalendarCell[][] = []
  for (let r = 0; r < 2; r++) {
    const row: CalendarCell[] = []
    for (let c = 0; c < 7; c++) {
      // UTC midnight on the cell's BKK calendar day. Host-TZ-independent.
      const d = new Date(
        Date.UTC(baseYear, baseMonth, baseDay + r * 7 + c, 0, 0, 0),
      )
      const cellMonth = d.getUTCMonth()
      const cellDay = d.getUTCDate()
      const dStr = `${d.getUTCFullYear()}-${cellMonth}-${cellDay}`
      row.push({
        date: d,
        day: cellDay,
        isCurrentMonth: cellMonth === baseMonth,
        isToday: dStr === todayStr,
      })
    }
    grid.push(row)
  }
  return grid
}

/**
 * Return the Monday of `date`'s week in Bangkok TZ, as a UTC Date whose
 * Bangkok-local midnight is that Monday. Caller passes the result straight
 * to `buildTwoWeekGrid`.
 *
 * Convention: weeks start on Monday and end on Sunday (matches the weekday
 * headers everywhere else in this codebase).
 */
export function mondayOfWeek(date: Date): Date {
  const zoned = toZonedTime(date, TZ)
  // JS Sunday = 0, Monday = 1, ..., Saturday = 6
  // Monday-first index: Sun → 6, Mon → 0, Tue → 1, ..., Sat → 5
  const offset = (zoned.getDay() + 6) % 7
  const y = zoned.getFullYear()
  const m = zoned.getMonth()
  const d = zoned.getDate() - offset
  // Return UTC midnight on the resulting day — same construction style as
  // buildMonthGrid. On a UTC host (Vercel) `getDate()` reads the day directly;
  // on a non-UTC host, UTC midnight is still inside the same calendar day in
  // Bangkok (BKK is UTC+7, so 00:00 UTC = 07:00 BKK, same date). Avoids the
  // off-by-one that bit `+07:00`-anchored Dates on UTC hosts.
  return new Date(Date.UTC(y, m, d, 0, 0, 0))
}

/**
 * Parse a `YYYY-MM-DD` URL param into a Date (Bangkok midnight). Returns
 * null when the input is missing, malformed, or describes an impossible
 * calendar date (e.g. Feb 30).
 */
export function parseWeekStartParam(input: string): Date | null {
  if (!input) return null
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const da = parseInt(m[3], 10)
  // UTC midnight on that day (host-TZ-independent). Round-trip detects
  // impossible inputs like Feb 30 which Date.UTC silently rolls over to
  // March 2 — if any field differs, the input was invalid.
  const probe = new Date(Date.UTC(y, mo - 1, da, 0, 0, 0))
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== mo - 1 ||
    probe.getUTCDate() !== da
  ) {
    return null
  }
  return probe
}

/** Format a (already zoned) Date as "YYYY-MM-DD" */
export function formatYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse "YYYY-MM-DD" → { year, month0 } */
export function parseMonthParam(monthParam: string): { year: number; month0: number } | null {
  const m = monthParam.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const month0 = parseInt(m[2], 10) - 1
  if (month0 < 0 || month0 > 11) return null
  return { year, month0 }
}
