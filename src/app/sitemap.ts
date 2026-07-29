import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'
import { localizedUrl } from '@/lib/locale-url'
import { TOPIC_LAST_MODIFIED, TOPIC_PAGES, topicPath } from '@/lib/topic-pages'
import { isThailandNetworkLocation } from '@/lib/current-location'
import {
  locationPublicPath,
  SITE_BASE,
  SITE_LOCATION_SLUG,
} from '@/lib/site-config'

type Entry = MetadataRoute.Sitemap[number]

/**
 * Emit a zh-CN entry and an /en entry for one path, each carrying the same
 * bidirectional hreflang `alternates.languages` map (+ x-default → zh). Both
 * URLs appear as independent sitemap entries so Google sees a return tag for
 * each language.
 */
function bothLocales(path: string, rest: Omit<Entry, 'url' | 'alternates'>): Entry[] {
  const languages = {
    'zh-CN': localizedUrl('zh-CN', path, SITE_BASE),
    en: localizedUrl('en', path, SITE_BASE),
    'x-default': localizedUrl('zh-CN', path, SITE_BASE),
  }
  return [
    { url: languages['zh-CN'], alternates: { languages }, ...rest },
    { url: languages.en, alternates: { languages }, ...rest },
  ]
}

function validDate(value: unknown, fallback: Date): Date {
  const date = typeof value === 'string' || value instanceof Date ? new Date(value) : fallback
  return Number.isNaN(date.getTime()) ? fallback : date
}

function latestDate(...dates: Date[]): Date {
  return dates.reduce((latest, date) => (date > latest ? date : latest))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayloadClient()
  const fallbackDate = new Date()

  const [locResult, actResult, jourResult] = await Promise.all([
    payload.find({
      collection: 'locations',
      limit: 10,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'activities',
      where: { status: { equals: 'published' } },
      limit: 1000,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'journal',
      where: { status: { equals: 'published' } },
      limit: 1000,
      depth: 1,
      overrideAccess: true,
    }),
  ])

  const locationDates = new Map<string, Date>()
  const activityDates = new Map<string, Date>()
  const journalDates = new Map<string, Date>()
  const networkLocationSlugs = new Set<string>()

  for (const loc of locResult.docs as any[]) {
    const slug = typeof loc.slug === 'string' ? loc.slug : null
    if (slug) {
      locationDates.set(slug, validDate(loc.updatedAt, fallbackDate))
      if (isThailandNetworkLocation(loc)) networkLocationSlugs.add(slug)
    }
  }

  for (const act of actResult.docs as any[]) {
    const locSlug = typeof act.location === 'object' ? act.location.slug : null
    if (!locSlug) continue
    const updatedAt = validDate(act.updatedAt, fallbackDate)
    activityDates.set(
      locSlug,
      activityDates.has(locSlug)
        ? latestDate(activityDates.get(locSlug) as Date, updatedAt)
        : updatedAt,
    )
  }

  for (const j of jourResult.docs as any[]) {
    const locSlug = typeof j.location === 'object' ? j.location.slug : null
    if (!locSlug) continue
    const updatedAt = validDate(j.updatedAt, fallbackDate)
    journalDates.set(
      locSlug,
      journalDates.has(locSlug)
        ? latestDate(journalDates.get(locSlug) as Date, updatedAt)
        : updatedAt,
    )
  }

  const contentDates = [
    ...[...locationDates].filter(([slug]) => networkLocationSlugs.has(slug)).map(([, date]) => date),
    ...[...activityDates].filter(([slug]) => networkLocationSlugs.has(slug)).map(([, date]) => date),
    ...[...journalDates].filter(([slug]) => networkLocationSlugs.has(slug)).map(([, date]) => date),
  ]
  const portalLastModified = contentDates.length > 0 ? latestDate(...contentDates) : fallbackDate

  const entries: MetadataRoute.Sitemap = SITE_LOCATION_SLUG
    ? []
    : [
        ...bothLocales('/', {
          lastModified: portalLastModified,
          changeFrequency: 'weekly',
          priority: 1.0,
        }),
        ...bothLocales('/topics', {
          lastModified: new Date(TOPIC_LAST_MODIFIED),
          changeFrequency: 'monthly',
          priority: 0.8,
        }),
      ]

  if (!SITE_LOCATION_SLUG) {
    for (const topic of TOPIC_PAGES) {
      entries.push(
        ...bothLocales(topicPath(topic.slug), {
          lastModified: new Date(TOPIC_LAST_MODIFIED),
          changeFrequency: 'monthly',
          priority: 0.75,
        }),
      )
    }
  }

  for (const loc of locResult.docs as any[]) {
    const slug = typeof loc.slug === 'string' ? loc.slug : null
    if (!slug) continue
    if (SITE_LOCATION_SLUG && slug !== SITE_LOCATION_SLUG) continue

    const locationModified = locationDates.get(slug) ?? fallbackDate
    const activityModified = latestDate(
      locationModified,
      activityDates.get(slug) ?? locationModified,
    )
    const journalModified = latestDate(locationModified, journalDates.get(slug) ?? locationModified)
    const locationHomeModified = latestDate(activityModified, journalModified)

    entries.push(
      ...bothLocales(locationPublicPath(slug), {
        lastModified: locationHomeModified,
        changeFrequency: 'weekly',
        priority: 0.9,
      }),
      ...bothLocales(locationPublicPath(slug, '/activities'), {
        lastModified: activityModified,
        changeFrequency: 'daily',
        priority: 0.9,
      }),
      ...bothLocales(locationPublicPath(slug, '/journal'), {
        lastModified: journalModified,
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
      ...bothLocales(locationPublicPath(slug, '/about'), {
        lastModified: locationModified,
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...bothLocales(locationPublicPath(slug, '/contact'), {
        lastModified: locationModified,
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...bothLocales(locationPublicPath(slug, '/book'), {
        lastModified: activityModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    )
  }

  for (const act of actResult.docs as any[]) {
    const locSlug = typeof act.location === 'object' ? act.location.slug : null
    if (!locSlug) continue
    if (SITE_LOCATION_SLUG && locSlug !== SITE_LOCATION_SLUG) continue
    entries.push(
      ...bothLocales(locationPublicPath(locSlug, `/activities/${act.slug}`), {
        lastModified: validDate(act.updatedAt, fallbackDate),
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    )
  }

  for (const j of jourResult.docs as any[]) {
    const locSlug = typeof j.location === 'object' ? j.location.slug : null
    if (!locSlug) continue
    if (SITE_LOCATION_SLUG && locSlug !== SITE_LOCATION_SLUG) continue
    entries.push(
      ...bothLocales(locationPublicPath(locSlug, `/journal/${j.slug}`), {
        lastModified: validDate(j.updatedAt, fallbackDate),
        changeFrequency: 'monthly',
        priority: 0.6,
      }),
    )
  }

  return entries
}
