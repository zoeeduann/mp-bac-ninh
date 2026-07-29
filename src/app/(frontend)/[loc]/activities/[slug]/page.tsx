import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

import {
  getLocationBySlug,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import { getLocale, t } from '@/lib/i18n'
import { getPayloadClient } from '@/lib/payload'
import { getCapacityForOccurrence } from '@/lib/content'
import { academyName } from '@/lib/short-name'
import { formatDateCompact } from '@/lib/time'
import { isSessionPast } from '@/lib/calendar'
import { toZonedTime, format as fmtTz } from 'date-fns-tz'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl } from '@/lib/site-config'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { activitySeoDescription, activitySeoKeywords } from '@/lib/seo'
import type { Activity, Media, Category, Location } from '@/payload-types'
import { RichText } from '@/components/RichText'
import { ScrollToBooking } from '@/components/activities/ScrollToBooking'
import BookSessionButton from '@/components/booking/BookSessionButton'
import ShareButton from '@/components/activities/ShareButton'
import ImageCarousel from '@/components/activities/ImageCarousel'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ loc: string; slug: string }>
}): Promise<Metadata> {
  const p = await params
  const locale = await getLocale()
  const location = await getLocationBySlug(p.loc, locale)
  if (!location) return {}

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { slug: { equals: p.slug } },
        { location: { equals: location.id } },
        { status: { equals: 'published' } },
      ],
    },
    locale: locale as any,
    fallbackLocale: 'zh-CN' as any,
    depth: 1,
    overrideAccess: true,
    limit: 1,
  })
  const activity = result.docs[0] as Activity | undefined
  if (!activity) return {}

  const heroImgUrl =
    activity.heroImage && typeof activity.heroImage !== 'number'
      ? (activity.heroImage as Media).url ?? undefined
      : undefined

  const displayName = academyName(location.city, location.name)
  const category =
    typeof activity.category === 'object' ? (activity.category as Category) : null
  const title = activity.seoTitle?.trim() || `${activity.title} — ${displayName}`
  const description = activitySeoDescription({
    locale,
    title: activity.title,
    displayName,
    city: location.city,
    shortDesc: activity.shortDesc,
    seoDescription: activity.seoDescription,
  })

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc, `/activities/${p.slug}`),
    imageUrl: heroImgUrl,
    locale,
    siteName: locationSiteName(location, locale),
    keywords: activitySeoKeywords({
      locale,
      title: activity.title,
      displayName,
      city: location.city,
      categoryName: category?.name as string | null | undefined,
      includeThailandNetwork: isThailandNetworkLocation(location),
    }),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, `/activities/${p.slug}`),
      en: locationUrl('en', p.loc, `/activities/${p.slug}`),
    },
  })
}

const TZ = 'Asia/Bangkok'

// ─── Media helpers ─────────────────────────────────────────────────────────
function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return (img as Media).url ?? null
}
function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return (img as Media).alt ?? fallback
}

// ─── Date helpers ──────────────────────────────────────────────────────────
function formatDayZh(date: Date): string {
  const z = toZonedTime(date, TZ)
  return fmtTz(z, 'M月 d日', { timeZone: TZ })
}
function formatDayEn(date: Date): string {
  const z = toZonedTime(date, TZ)
  return fmtTz(z, 'MMM d', { timeZone: TZ })
}
function formatTimeRange(startAt: string, endAt: string): string {
  const start = toZonedTime(new Date(startAt), TZ)
  const end = toZonedTime(new Date(endAt), TZ)
  return `${fmtTz(start, 'HH:mm', { timeZone: TZ })} – ${fmtTz(end, 'HH:mm', { timeZone: TZ })} ICT`
}
function formatWeekdayZh(date: Date): string {
  const z = toZonedTime(date, TZ)
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[z.getDay()]
}
function formatWeekdayEn(date: Date): string {
  const z = toZonedTime(date, TZ)
  return fmtTz(z, 'EEEE', { timeZone: TZ })
}

// ─── Activity card (shared list-style card for related section) ────────────
function nextOccurrenceDate(activity: Activity): string | null {
  const now = Date.now()
  const occs = (activity.occurrences ?? [])
    .filter(
      (o) =>
        o.startAt &&
        o.status !== 'cancelled' &&
        o.status !== 'deleted' &&
        new Date(o.startAt).getTime() > now,
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  return occs[0]?.startAt ?? null
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ loc: string; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [p, sp] = await Promise.all([params, searchParams])

  const locSlug = p.loc

  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  const location = await getLocationBySlug(locSlug, locale)
  if (!location) notFound()

  // ─ Fetch activity ───────────────────────────────────────────────────
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { slug: { equals: p.slug } },
        { location: { equals: location.id } },
        { status: { equals: 'published' } },
      ],
    },
    locale: locale as any,
    fallbackLocale: 'zh-CN' as any,
    depth: 2,
    overrideAccess: true,
    limit: 1,
  })

  const activity = result.docs[0] as Activity | undefined
  if (!activity) notFound()

  // Cross-location guard
  const actLocSlug =
    typeof activity.location === 'object'
      ? (activity.location as Location).slug
      : null
  if (actLocSlug && actLocSlug !== locSlug) notFound()

  // ─ Search params ────────────────────────────────────────────────────
  const rawOcc = sp['occ']
  const focusOccId = (Array.isArray(rawOcc) ? rawOcc[0] : rawOcc) ?? null
  const rawSrc = sp['src']
  const rawSrcValue = (Array.isArray(rawSrc) ? rawSrc[0] : rawSrc) ?? 'activity_detail'
  const srcParam: 'activity_detail' | 'shared_link' =
    rawSrcValue === 'shared_link' ? 'shared_link' : 'activity_detail'

  // ─ Related activities ────────────────────────────────────────────────
  const relatedResult = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { status: { equals: 'published' } },
        { location: { equals: location.id } },
        // Exclude current activity (id field is number)
        ...(activity.id ? [{ id: { not_equals: activity.id } }] : []),
      ],
    },
    locale: locale as any,
    fallbackLocale: 'zh-CN' as any,
    depth: 2,
    limit: 20,
    overrideAccess: true,
  })
  const now = new Date()
  const sortedRelated = relatedResult.docs
    .map((a: any) => {
      const occs = (a.occurrences ?? []).filter(
        (o: any) =>
          o.startAt &&
          o.status !== 'cancelled' &&
          o.status !== 'deleted' &&
          new Date(o.startAt) > now,
      )
      occs.sort((x: any, y: any) => new Date(x.startAt).getTime() - new Date(y.startAt).getTime())
      return { activity: a, next: occs[0] ?? null }
    })
    .sort((a: any, b: any) => {
      // Activities with no future occurrences sink to the bottom
      if (!a.next && !b.next) return 0
      if (!a.next) return 1
      if (!b.next) return -1
      return new Date(a.next.startAt).getTime() - new Date(b.next.startAt).getTime()
    })
    .map((x: any) => x.activity)
    .slice(0, 2)
  const relatedActivities = sortedRelated as Activity[]

  // ─ Occurrences (sorted, no deleted) ─────────────────────────────────
  const sortedOccurrences = (activity.occurrences ?? [])
    .filter((o) => o.status !== 'deleted')
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  // ─ Capacity data (parallel fetch per occurrence) ─────────────────────
  const capacityResults = await Promise.all(
    sortedOccurrences.map((occ) => {
      const effectiveCap = occ.capacityOverride ?? activity.capacity
      return getCapacityForOccurrence(
        activity.id,
        occ.id ?? '',
        effectiveCap,
      )
    }),
  )

  // ─ Meta ─────────────────────────────────────────────────────────────
  const heroUrl = mediaUrl(activity.heroImage)
  const heroAlt = mediaAlt(activity.heroImage, activity.title)
  // Hero + gallery merged into one swipeable carousel.
  const carouselImages = [
    ...(heroUrl ? [{ url: heroUrl, alt: heroAlt }] : []),
    ...((activity.gallery ?? [])
      .map((g) => ({
        url: mediaUrl((g as { image?: number | Media }).image),
        alt: mediaAlt((g as { image?: number | Media }).image, activity.title),
      }))
      .filter((im): im is { url: string; alt: string } => Boolean(im.url))),
  ]
  const category = typeof activity.category === 'object' ? (activity.category as Category) : null
  const academyDisplayName = academyName(location.city, location.name)

  // ─ Future occurrences for schema.org JSON-LD ────────────────────────
  const futureOccurrences = (activity.occurrences ?? [])
    .filter(
      (o) =>
        o.startAt &&
        o.status !== 'cancelled' &&
        o.status !== 'deleted' &&
        new Date(o.startAt).getTime() > now.getTime(),
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

  const locationAddress =
    (location as any).address ||
    (isThailandNetworkLocation(location)
      ? `${location.city}, Thailand`
      : location.city)

  const activityUrl = locationUrl(locale, locSlug, `/activities/${activity.slug}`)
  const breadcrumb = breadcrumbJsonLd([
    ...(isThailandNetworkLocation(location)
      ? [{ name: isZh ? '总门户' : 'Network', url: locationUrl(locale, locSlug) }]
      : []),
    { name: academyDisplayName, url: locationUrl(locale, locSlug) },
    { name: t(locale, 'eyebrow.all_activities'), url: locationUrl(locale, locSlug, '/activities') },
    { name: activity.title, url: activityUrl },
  ])

  return (
    <div>
      {/* ─── SCHEMA.ORG BREADCRUMB ────────────────────────────────── */}
      <JsonLd data={breadcrumb} />

      {/* ─── SCHEMA.ORG EVENT JSON-LD (one per upcoming session) ──── */}
      {futureOccurrences.map((occ) => (
        <JsonLd
          key={occ.id ?? occ.startAt}
          data={{
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: activity.title,
            description: activity.shortDesc ?? undefined,
            url: activityUrl,
            inLanguage: isZh ? 'zh-CN' : 'en',
            startDate: occ.startAt,
            endDate: occ.endAt,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            location: {
              '@type': 'Place',
              name: academyDisplayName,
              address: locationAddress,
            },
            ...(heroUrl ? { image: heroUrl } : {}),
            organizer: {
              '@type': 'Organization',
              // The specific academy is the organizer; the network is its parent.
              name: academyDisplayName,
              url: locationUrl(locale, locSlug),
            },
            offers: {
              '@type': 'Offer',
              price: '0',
              ...(isThailandNetworkLocation(location) ? { priceCurrency: 'THB' } : {}),
              availability: 'https://schema.org/InStock',
              url: `${activityUrl}?occ=${occ.id ?? ''}&src=shared`,
            },
          }}
        />
      ))}

      {/* ─── HERO (hero + gallery carousel) ───────────────────────── */}
      {carouselImages.length > 0 && (
        <ImageCarousel
          images={carouselImages}
          className="w-full h-[clamp(320px,52vw,680px)]"
          priority
          sizes="100vw"
        />
      )}

      {/* ─── BREADCRUMB ───────────────────────────────────────────── */}
      <div className="px-[6vw] py-5 border-b border-hairline">
        <nav className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft flex items-center gap-2 flex-wrap">
          <Link href={locationPath(locale, locSlug)} className="text-ink-soft no-underline hover:text-ink transition-colors">
            {academyDisplayName}
          </Link>
          <span>/</span>
          <Link href={locationPath(locale, locSlug, '/activities')} className="text-ink-soft no-underline hover:text-ink transition-colors">
            {isZh ? '活动' : 'Activities'}
          </Link>
          <span>/</span>
          <span className="text-ink">{activity.title}</span>
        </nav>
      </div>

      {/* ─── ARTICLE WRAP ─────────────────────────────────────────── */}
      <div className="px-[6vw] py-16">
        <div className="max-w-prose">
          {/* Eyebrow */}
          {category && (
            <p className={`font-sans text-[11px] font-semibold ${isZh ? 'tracking-[0.3em]' : 'tracking-[0.18em] uppercase'} text-ink-soft mb-5`}>
              {category.name as string}
            </p>
          )}

          {/* Title */}
          <h1
            className="font-serif font-normal text-ink leading-[1.2] mb-4"
            style={{ fontSize: 'clamp(26px, 3.5vw, 44px)' }}
          >
            {activity.title}
          </h1>

          {/* Short desc as italic subtitle — preserve admin line breaks */}
          {activity.shortDesc && (
            <p className="font-serif text-[18px] text-ink-soft leading-[1.55] mb-6 whitespace-pre-line">
              {activity.shortDesc}
            </p>
          )}

          {/* Meta strip */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10 text-[13px] text-ink-soft font-sans">
            <span className="flex items-center gap-2">
              <span>📍</span>
              <span>
                {activity.venueNote ||
                  (isZh ? `${location.name}` : `${academyDisplayName} · ${location.city}`)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span>👥</span>
              <span>
                {isZh
                  ? `${activity.capacity} ${t(locale, 'meta.spots')}`
                  : `${activity.capacity} spots per session`}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span>🌐</span>
              <span>{t(locale, 'meta.bilingual_indicator')}</span>
            </span>
          </div>

          {/* Share actions — system share button.
              On mobile the share sheet exposes WeChat / Messages / Copy link;
              on desktop it falls back to copying the URL to clipboard
              (ShareButton handles both).

              "下载海报" button temporarily hidden — mobile capture still
              loses the hero background on some iOS devices despite the
              data-URL fix. Re-enable once we've nailed the remaining
              capture path (likely: switch to server-side rendering via
              @vercel/og or Playwright). */}
          <div className="mb-10 flex flex-wrap gap-3">
            {/*
            <a
              href={localePath(locale, `/${locSlug}/activities/${activity.slug}/poster?autodownload=1`)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky rounded-full px-5 py-[0.55rem] no-underline transition-colors duration-150 hover:bg-blue-deep hover:text-paper"
            >
              {isZh ? '下载海报' : 'Download poster'}
            </a>
            */}
            <ShareButton
              url={locationPath(locale, locSlug, `/activities/${activity.slug}`)}
              title={`${activity.title} — ${academyDisplayName}`}
              text={(activity.shortDesc as string | null | undefined) ?? undefined}
              locale={locale}
              variant="label"
            />
          </div>

          {/* Long body */}
          {activity.description && (
            <div className="font-sans text-[15px] text-ink leading-[1.8] mb-4">
              <RichText data={activity.description} />
            </div>
          )}
        </div>
      </div>

      {/* ─── SESSIONS ─────────────────────────────────────────────── */}
      <section
        id="sessions"
        className="px-[6vw] py-16 border-t border-hairline"
      >
        <div style={{ maxWidth: '860px' }}>
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-10">
            {t(locale, 'eyebrow.sessions')}
          </p>

          {sortedOccurrences.length > 0 ? (
            <div className="flex flex-col divide-y divide-hairline">
              {sortedOccurrences.map((occ, i) => {
                const { occupied, remaining } = capacityResults[i]
                const effectiveCap = occ.capacityOverride ?? activity.capacity
                const isFull = remaining === 0
                const occId = occ.id ?? `occ-${i}`
                const isHighlighted = focusOccId && occId === focusOccId
                const sessionLabel = isZh
                  ? `${formatDayZh(new Date(occ.startAt))}(${formatWeekdayZh(new Date(occ.startAt))}) · ${formatTimeRange(occ.startAt, occ.endAt)}`
                  : `${formatWeekdayEn(new Date(occ.startAt))} ${formatDayEn(new Date(occ.startAt))} · ${formatTimeRange(occ.startAt, occ.endAt)}`

                return (
                  <div
                    key={occId}
                    id={`book-${occId}`}
                    className={[
                      'flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 py-6',
                      isHighlighted ? 'bg-sky/10 -mx-4 px-4 rounded' : '',
                    ].join(' ')}
                  >
                    {/* Date block */}
                    <div className="flex-none min-w-[130px]">
                      <span className="font-serif text-[22px] font-normal text-ink block leading-tight">
                        {isZh
                          ? formatDayZh(new Date(occ.startAt))
                          : formatDayEn(new Date(occ.startAt))}
                      </span>
                      <span className="font-sans text-[12px] text-ink-soft mt-1 block">
                        {formatTimeRange(occ.startAt, occ.endAt)}
                        {' · '}
                        {isZh
                          ? formatWeekdayZh(new Date(occ.startAt))
                          : formatWeekdayEn(new Date(occ.startAt))}
                      </span>
                    </div>

                    {/* Meta block */}
                    <div className="flex-1">
                      <span className="font-sans text-[13px] text-ink-soft block">
                        {activity.venueNote ||
                          (isZh ? location.name : `${academyDisplayName} · ${location.city}`)}
                      </span>
                      <span className="font-sans text-[12px] text-ink-soft block mt-1">
                        {occupied}/{effectiveCap}{' '}
                        {t(locale, 'meta.registered')}
                        {' · '}
                        {remaining > 0 ? (
                          <span className={remaining <= 3 ? 'text-clay font-semibold' : ''}>
                            {isZh ? `${remaining} ${t(locale, 'meta.spots')}` : `${remaining} spots left`}
                          </span>
                        ) : (
                          <span className="text-ink-soft">{t(locale, 'meta.full')}</span>
                        )}
                      </span>
                    </div>

                    {/* Book button / Full indicator / Ended */}
                    <div className="flex-none">
                      {isSessionPast(occ.startAt, now) ? (
                        <span className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/30 rounded-full px-5 py-[0.45rem] cursor-default">
                          {isZh ? '已结束' : 'Ended'}
                        </span>
                      ) : (
                        <BookSessionButton
                          activityId={activity.id}
                          activitySlug={activity.slug}
                          activityTitle={activity.title}
                          occurrenceId={occId}
                          sessionLabel={sessionLabel}
                          locationId={location.id}
                          locationSlug={locSlug}
                          locationName={academyDisplayName}
                          locationWechatId={(location as any).wechatId ?? undefined}
                          locale={locale}
                          source={srcParam}
                          isFull={isFull}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="font-sans text-[13px] text-ink-soft">
              {t(locale, 'meta.no_sessions')}
            </p>
          )}
        </div>

        {/* Shareable-link scroll effect */}
        {focusOccId && <ScrollToBooking targetId={`book-${focusOccId}`} />}
      </section>

      {/* ─── NOTES ────────────────────────────────────────────────── */}
      {activity.notes && (
        <section className="px-[6vw] py-16 border-t border-hairline">
          <div style={{ maxWidth: '860px' }}>
            <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-8">
              {t(locale, 'eyebrow.notes')}
            </p>
            <div className="font-sans text-[14px] text-ink-soft leading-[1.8]">
              <RichText data={activity.notes} />
            </div>
          </div>
        </section>
      )}

      {/* ─── RELATED ACTIVITIES ───────────────────────────────────── */}
      {relatedActivities.length > 0 && (
        <section className="px-[6vw] py-16 border-t border-hairline">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-12">
            {t(locale, 'eyebrow.related')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
            {relatedActivities.map((rel) => {
              const imgUrl = mediaUrl(rel.heroImage)
              const imgAlt = mediaAlt(rel.heroImage, rel.title)
              const upcoming = nextOccurrenceDate(rel)

              return (
                <Link
                  key={rel.id}
                  href={locationPath(locale, locSlug, `/activities/${rel.slug}`)}
                  className="block no-underline text-inherit group"
                >
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={imgAlt}
                      width={900}
                      height={540}
                      className="w-full aspect-[5/3] object-cover saturate-[0.85] block"
                    />
                  ) : (
                    <div className="w-full aspect-[5/3] bg-ink/15" />
                  )}
                  <div className="pt-5 pb-6 border-t border-hairline">
                    {upcoming && (
                      <p className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-soft mb-2">
                        {formatDateCompact(new Date(upcoming), locale)}
                      </p>
                    )}
                    <h3 className="font-serif text-[20px] font-medium text-ink mb-2">
                      {rel.title}
                    </h3>
                    {rel.shortDesc && (
                      <p className="font-sans text-[13px] text-ink-soft mb-4 leading-[1.6] whitespace-pre-line line-clamp-3">
                        {rel.shortDesc}
                      </p>
                    )}
                    <span className="font-sans text-[12px] font-semibold text-sky tracking-[0.04em] transition-colors duration-150 group-hover:text-ink">
                      {t(locale, 'cta.view_details')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
