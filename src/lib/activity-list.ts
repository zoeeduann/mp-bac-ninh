import type { Locale } from './i18n'
import { formatDateCompact } from './time'

/**
 * Pure helpers shared by every public activity list (home, /activities,
 * related activities, /vi, sitemap).
 */

interface OccurrenceLike {
  startAt?: string | null
  status?: string | null
}

export interface ActivityLike {
  slug?: string | null
  occurrences?: OccurrenceLike[] | null
}

/** How many past activities the list shows before "show more". */
export const PAST_ACTIVITIES_INITIAL = 12

/** A slug that can form a working URL (not blank / whitespace only). */
export function hasUsableSlug(activity: { slug?: unknown } | null | undefined): boolean {
  return typeof activity?.slug === 'string' && activity.slug.trim().length > 0
}

/** Drop records whose slug would produce a broken `/activities/  ` link. */
export function withUsableSlugs<T extends { slug?: unknown }>(activities: T[]): T[] {
  return activities.filter(hasUsableSlug)
}

function liveOccurrences(activity: ActivityLike): OccurrenceLike[] {
  return (activity.occurrences ?? []).filter(
    (o) => Boolean(o.startAt) && o.status !== 'cancelled' && o.status !== 'deleted',
  )
}

/** Earliest non-cancelled session that starts after `now`, or null. */
export function nextUpcomingStart(activity: ActivityLike, now: Date = new Date()): string | null {
  const t = now.getTime()
  const next = liveOccurrences(activity)
    .filter((o) => new Date(o.startAt as string).getTime() > t)
    .sort((a, b) => new Date(a.startAt as string).getTime() - new Date(b.startAt as string).getTime())[0]
  return next?.startAt ?? null
}

/** Latest non-cancelled session start (for ordering past activities). */
export function lastSessionStart(activity: ActivityLike): string | null {
  const last = liveOccurrences(activity).sort(
    (a, b) => new Date(b.startAt as string).getTime() - new Date(a.startAt as string).getTime(),
  )[0]
  return last?.startAt ?? null
}

/** Days after its last session that an activity stays in the sitemap. */
export const SITEMAP_ENDED_GRACE_DAYS = 14

/**
 * Whether every session started more than SITEMAP_ENDED_GRACE_DAYS ago. Such
 * one-off pages stay reachable but are left out of the sitemap. An activity
 * with no live session (a standing introduction page) never counts as ended.
 */
export function endedLongAgo(activity: ActivityLike, now: Date = new Date()): boolean {
  const last = lastSessionStart(activity)
  if (!last) return false
  return now.getTime() - new Date(last).getTime() > SITEMAP_ENDED_GRACE_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Split into upcoming (soonest first) and past (most recent first). Activities
 * without any live session count as past. Blank-slug records are dropped.
 */
export function splitUpcomingPast<T extends ActivityLike>(
  activities: T[],
  now: Date = new Date(),
): { upcoming: T[]; past: T[] } {
  const upcoming: { a: T; next: number }[] = []
  const past: { a: T; last: number }[] = []
  for (const a of withUsableSlugs(activities)) {
    const next = nextUpcomingStart(a, now)
    if (next) {
      upcoming.push({ a, next: new Date(next).getTime() })
    } else {
      const last = lastSessionStart(a)
      past.push({ a, last: last ? new Date(last).getTime() : 0 })
    }
  }
  upcoming.sort((x, y) => x.next - y.next)
  past.sort((x, y) => y.last - x.last)
  return { upcoming: upcoming.map((x) => x.a), past: past.map((x) => x.a) }
}

// ─── Card date eyebrow ─────────────────────────────────────────────────────

const DAY_MS = 86_400_000
// ICT has no DST, so wall time is a fixed +07:00 (same as formatDateCompact).
const ICT_OFFSET_MS = 7 * 3_600_000
const ZH_WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const EN_WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface WeeklyPattern {
  weekdays: number[] // Monday first, Sunday last
  time: string // "13:00" ICT
}

/**
 * Weekly pattern of the future sessions: at least two of them, all at the
 * same ICT time, and each weekday repeating exactly 7 days apart. Cancelled
 * sessions still count, so skipping one week keeps the pattern.
 */
function weeklyPattern(activity: ActivityLike, now: Date): WeeklyPattern | null {
  const starts = (activity.occurrences ?? [])
    .filter((occ) => occ.startAt && occ.status !== 'deleted')
    .map((occ) => new Date(occ.startAt as string).getTime())
    .filter((ts) => !Number.isNaN(ts) && ts > now.getTime())
    .sort((a, b) => a - b)
  if (starts.length < 2) return null

  const wall = starts.map((ts) => new Date(ts + ICT_OFFSET_MS))
  const time = wall[0].toISOString().slice(11, 16)
  if (wall.some((d) => d.toISOString().slice(11, 16) !== time)) return null

  const daysByWeekday = new Map<number, number[]>()
  for (const d of wall) {
    const day = Math.floor(d.getTime() / DAY_MS)
    daysByWeekday.set(d.getUTCDay(), [...(daysByWeekday.get(d.getUTCDay()) ?? []), day])
  }
  for (const days of daysByWeekday.values()) {
    if (days.length < 2) return null
    if (days.some((day, i) => i > 0 && day - days[i - 1] !== 7)) return null
  }

  const weekdays = [...daysByWeekday.keys()].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  return { weekdays, time }
}

function joinEnglish(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} & ${items.at(-1)}`
}

export interface ActivityDateEyebrow {
  /** "每周三 13:00 ICT" for weekly activities, else "10月 21日 · 13:00 ICT". */
  label: string
  /** "下一场 10月21日" under a weekly label; null for one-off dates. */
  note: string | null
}

/** Small line under a weekly eyebrow ("下一场 10月21日"). */
export const EYEBROW_NOTE_CLASS = '-mt-1 mb-2 font-sans text-[12px] tracking-[0.04em] text-ink-soft'

/**
 * Card eyebrow for an upcoming activity. Weekly activities show their rhythm
 * ("每周三 13:00 ICT" / "EVERY WED 13:00 ICT") with the next date as a note
 * ("下一场 10月21日" / "Next Oct 21"); anything else shows the next session.
 * Series-registration courses keep their own range label on /activities.
 */
export function activityDateEyebrow(
  activity: ActivityLike,
  locale: Locale,
  now: Date = new Date(),
): ActivityDateEyebrow | null {
  const next = nextUpcomingStart(activity, now)
  if (next === null) return null
  const pattern = weeklyPattern(activity, now)
  if (!pattern) return { label: formatDateCompact(new Date(next), locale), note: null }

  const nextWall = new Date(new Date(next).getTime() + ICT_OFFSET_MS)
  const month = nextWall.getUTCMonth()
  const date = nextWall.getUTCDate()
  if (locale === 'zh-CN') {
    const days =
      pattern.weekdays.length === 7 ? '每天' : `每周${pattern.weekdays.map((d) => ZH_WEEKDAYS[d]).join('、')}`
    return { label: `${days} ${pattern.time} ICT`, note: `下一场 ${month + 1}月${date}日` }
  }
  const days =
    pattern.weekdays.length === 7
      ? 'DAILY'
      : `EVERY ${joinEnglish(pattern.weekdays.map((d) => EN_WEEKDAYS[d]))}`
  return { label: `${days} ${pattern.time} ICT`, note: `Next ${EN_MONTHS[month]} ${date}` }
}
