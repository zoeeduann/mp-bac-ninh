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
