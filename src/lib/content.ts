import type { Locale } from './i18n'
import { isSessionPast } from './calendar'

// ─── Types ────────────────────────────────────────────────────────────────

export interface CategoryWithCount {
  id: number
  name: string
  slug: string
  order: number
  activityCount: number
}

export interface CapacityResult {
  occupied: number
  remaining: number
}

/**
 * Static bilingual city name map keyed by location slug.
 * Used for the portal card eyebrow so it always shows both languages
 * regardless of the active locale.
 */
export const CITY_BILINGUAL: Record<string, { zh: string; en: string }> = {
  bangkok:   { zh: '曼谷',  en: 'Bangkok' },
  chiangmai: { zh: '清迈',  en: 'Chiang Mai' },
  phuket:    { zh: '普吉',  en: 'Phuket' },
}

export async function getPortalHome(locale: Locale) {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  return payload.findGlobal({
    slug: 'portal-home',
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
}

export async function getRecentJournalAcrossNetwork(
  locale: Locale,
  locationIds: number[],
  limit = 6,
) {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  if (locationIds.length === 0) return []
  const result = await payload.find({
    collection: 'journal',
    where: {
      and: [
        { status: { equals: 'published' } },
        { location: { in: locationIds } },
      ],
    },
    sort: '-date',
    limit,
    depth: 2,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
  return result.docs
}

export async function getRecentJournalForLocation(
  locationId: number,
  locale: Locale,
  limit = 3,
) {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'journal',
    where: {
      and: [
        { status: { equals: 'published' } },
        { location: { equals: locationId } },
      ],
    },
    sort: '-date',
    limit,
    depth: 2,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
  return result.docs
}

export async function getFeaturedActivitiesForLocation(
  locationId: number,
  locale: Locale,
  limit = 3,
) {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { status: { equals: 'published' } },
        { location: { equals: locationId } },
      ],
    },
    limit: 50,
    depth: 2,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })

  // Sort by NEXT upcoming occurrence — activities without any future
  // occurrence are excluded from the featured list entirely.
  const now = new Date()
  const annotated = result.docs
    .map((a: any) => {
      const occs = Array.isArray(a.occurrences) ? a.occurrences : []
      const future = occs
        .filter(
          (o: any) =>
            o.startAt &&
            o.status !== 'cancelled' &&
            o.status !== 'deleted' &&
            new Date(o.startAt) > now,
        )
        .sort(
          (x: any, y: any) =>
            new Date(x.startAt).getTime() - new Date(y.startAt).getTime(),
        )
      return { activity: a, next: future[0] ?? null }
    })
    .filter((x) => x.next !== null)
    .sort(
      (a, b) =>
        new Date(a.next!.startAt).getTime() -
        new Date(b.next!.startAt).getTime(),
    )

  return annotated.slice(0, limit).map((x) => x.activity)
}

export interface NextSession {
  startAt: string
  activityTitle: string
  activitySlug: string
}

/**
 * Find the next upcoming occurrence across all published activities at a location.
 * Returns null if none found.
 */
export async function getNextSessionForLocation(
  locationId: number,
): Promise<NextSession | null> {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { status: { equals: 'published' } },
        { location: { equals: locationId } },
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })

  return findNextSession(result.docs)
}

/**
 * Pure function: given a list of activities, find the next upcoming occurrence.
 * Exported for unit testing.
 */
export function findNextSession(activities: any[]): NextSession | null {
  const now = Date.now()
  const candidates: { startAt: number; activityTitle: string; activitySlug: string }[] = []

  for (const act of activities) {
    const occs = act.occurrences ?? []
    for (const occ of occs) {
      if (!occ.startAt) continue
      if (occ.status === 'cancelled' || occ.status === 'deleted') continue
      const ts = new Date(occ.startAt).getTime()
      if (ts > now) {
        candidates.push({
          startAt: ts,
          activityTitle: typeof act.title === 'string' ? act.title : '',
          activitySlug: typeof act.slug === 'string' ? act.slug : '',
        })
      }
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => a.startAt - b.startAt)
  const winner = candidates[0]
  return {
    startAt: new Date(winner.startAt).toISOString(),
    activityTitle: winner.activityTitle,
    activitySlug: winner.activitySlug,
  }
}

// ─── Activities helpers ────────────────────────────────────────────────────

/**
 * All published activities for a given location, with full depth (category,
 * heroImage, occurrences).  No occurrence-based filtering so both list and
 * calendar views can work from the same dataset.
 */
export async function getAllPublishedActivitiesForLocation(
  locationId: number,
  locale: Locale,
) {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { status: { equals: 'published' } },
        { location: { equals: locationId } },
      ],
    },
    limit: 200,
    depth: 2,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
  return result.docs
}

/**
 * Categories that have at least one published activity at this location.
 * Returns categories sorted by their `order` field.
 */
export async function getCategoriesWithCountsForLocation(
  locationId: number,
  locale: Locale,
): Promise<CategoryWithCount[]> {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()

  // 1. Get all published activities at this location
  const acts = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { location: { equals: locationId } },
        { status: { equals: 'published' } },
      ],
    },
    limit: 200,
    depth: 1,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })

  // 2. Count activities per category id
  const countByCat = new Map<number, number>()
  for (const a of acts.docs) {
    const catId =
      typeof (a as any).category === 'object'
        ? (a as any).category?.id
        : (a as any).category
    if (catId) {
      countByCat.set(catId, (countByCat.get(catId) || 0) + 1)
    }
  }

  const catIds = Array.from(countByCat.keys())
  if (catIds.length === 0) return []

  // 3. Fetch category docs with localized names
  const cats = await payload.find({
    collection: 'categories',
    where: { id: { in: catIds } },
    sort: 'order',
    limit: 100,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })

  return (cats.docs as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    order: c.order ?? 0,
    activityCount: countByCat.get(c.id) || 0,
  }))
}

/**
 * Capacity helper: sum pending+confirmed guest counts for a specific occurrence
 * and compute remaining spots given the effective capacity.
 *
 * @param activityId   - activity doc ID
 * @param occurrenceId - occurrence row id (string) stored on reservations
 * @param capacity     - effective capacity (capacityOverride ?? activity.capacity)
 */
// ─── Upcoming sessions helper ──────────────────────────────────────────────

export interface UpcomingSession {
  activity: {
    id: number
    title: string
    slug: string
    capacity: number
    location: any
    [k: string]: any
  }
  occurrence: {
    id: string
    startAt: string
    endAt: string
    capacityOverride?: number | null
  }
  remaining: number
}

/**
 * Fetch upcoming sessions across all published activities for a location.
 * Returns individual occurrence rows flattened and sorted by startAt ascending.
 * Capacity is computed by calling getCapacityForOccurrence.
 */
export async function getUpcomingSessionsForLocation(
  locationId: number,
  locale: Locale,
  limit = 8,
): Promise<UpcomingSession[]> {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { status: { equals: 'published' } },
        { location: { equals: locationId } },
      ],
    },
    limit: 100,
    depth: 2,
    locale,
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })

  const now = new Date()

  // Flatten future occurrences
  const candidates: Array<{
    activity: any
    occurrence: { id: string; startAt: string; endAt: string; capacityOverride?: number | null }
  }> = []

  for (const activity of result.docs) {
    const occs = (activity as any).occurrences ?? []
    for (const occ of occs) {
      if (!occ.startAt || !occ.id) continue
      if (occ.status === 'cancelled' || occ.status === 'deleted') continue
      if (isSessionPast(occ.startAt, now)) continue
      candidates.push({
        activity,
        occurrence: {
          id: occ.id,
          startAt: occ.startAt,
          endAt: occ.endAt,
          capacityOverride: occ.capacityOverride ?? null,
        },
      })
    }
  }

  // Sort ascending by startAt, take first `limit`
  candidates.sort(
    (a, b) =>
      new Date(a.occurrence.startAt).getTime() - new Date(b.occurrence.startAt).getTime(),
  )
  const sliced = candidates.slice(0, limit)

  // Fetch capacity for each
  const withCapacity = await Promise.all(
    sliced.map(async ({ activity, occurrence }) => {
      const effectiveCap = occurrence.capacityOverride ?? (activity as any).capacity
      const { remaining } = await getCapacityForOccurrence(
        (activity as any).id,
        occurrence.id,
        effectiveCap,
      )
      return { activity, occurrence, remaining }
    }),
  )

  return withCapacity
}

export async function getCapacityForOccurrence(
  activityId: number,
  occurrenceId: string,
  capacity: number,
): Promise<CapacityResult> {
  const { getPayloadClient } = await import('./payload')
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'reservations',
    where: {
      and: [
        { activity: { equals: activityId } },
        { occurrenceId: { equals: occurrenceId } },
        { status: { in: ['pending', 'confirmed'] } },
      ],
    },
    limit: 1000,
    overrideAccess: true,
  })

  const occupied = (docs as any[]).reduce(
    (sum, r) => sum + (r.guests ?? 1),
    0,
  )

  return { occupied, remaining: Math.max(0, capacity - occupied) }
}
