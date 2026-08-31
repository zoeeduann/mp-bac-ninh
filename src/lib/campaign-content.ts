import type { Activity, Location, Media } from '@/payload-types'
import type { CampaignFocus } from './campaigns'
import { SITE_BASE } from './site-config'

/** Public, read-only content API. Preview never connects to the shared database. */
export async function getCampaignContent() {
  const origin = process.env.CAMPAIGN_CONTENT_ORIGIN || SITE_BASE
  const locationQuery = new URLSearchParams({
    'where[slug][equals]': 'bac-ninh',
    locale: 'zh-CN',
    depth: '1',
    limit: '1',
  })
  const locationResponse = await fetch(`${origin}/api/locations?${locationQuery}`, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(10000),
  })
  if (!locationResponse.ok) throw new Error('Campaign location content unavailable')
  const location = (await locationResponse.json()).docs?.[0] as Location | undefined
  if (!location || location.slug !== 'bac-ninh') throw new Error('Bac Ninh location unavailable')

  const activityQuery = new URLSearchParams({
    'where[location][equals]': String(location.id),
    'where[status][equals]': 'published',
    locale: 'zh-CN',
    depth: '1',
    limit: '100',
  })
  let activities: Activity[] = []
  try {
    const response = await fetch(`${origin}/api/activities?${activityQuery}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error('Activity content unavailable')
    activities = (await response.json()).docs ?? []
  } catch {
    // Keep the introduction and inquiry usable, without inventing a schedule.
    console.warn('[campaign] Could not load public activity examples')
  }
  return { location, activities }
}

export function campaignMedia(value: number | Media | null | undefined) {
  if (!value || typeof value === 'number') return null
  return {
    src: value.sizes?.hero?.url || value.url || '',
    small: value.sizes?.card?.url || value.url || '',
    alt: value.alt || '',
  }
}

export function campaignExamples(activities: Activity[], focus: CampaignFocus, now = Date.now()) {
  const selected =
    focus === 'mindfulness'
      ? [
          'tea-ceremony-seven-forms-training',
          'tai-chi-mindfulness-ball',
          'peaceful-meditation-tea-gathering',
        ]
      : [
          'shared-reading-buddhist-worldview',
          'happiness-life-reading-club-series',
          'a-stroke-awakens-your-inherent-wholeness',
        ]
  return selected.flatMap((slug) => {
    const activity = activities.find((item) => item.slug === slug && item.status === 'published')
    if (!activity) return []
    const dates = (activity.occurrences ?? [])
      .filter((occ) => occ.status !== 'cancelled' && occ.status !== 'deleted')
      .map((occ) => new Date(occ.startAt).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => a - b)
    // A started full-series course must never be advertised as a new enrollment.
    const seriesStarted = activity.registrationMode === 'series' && dates[0] <= now
    const next = dates.find((date) => date > now)
    const state =
      seriesStarted && next
        ? '系列进行中 · 新一期请咨询'
        : next
          ? '已有后续场次 · 详情请咨询'
          : '往期活动 · 新安排请咨询'
    return [{ activity, state }]
  })
}
