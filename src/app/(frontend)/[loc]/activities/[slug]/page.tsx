import type { Metadata } from 'next'
import { pageTitle, splitPlaceName } from '@/lib/page-title'
import { activityExcerpt } from '@/lib/activity-text'
import { hasUsableSlug } from '@/lib/activity-list'
import { remainingSeatsText } from '@/lib/seats'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

import {
  getLocationBySlug,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import { getLocale, t } from '@/lib/i18n'
import { getPayloadClient } from '@/lib/payload'
import { getCapacityForOccurrence, hasEnglishVersion } from '@/lib/content'
import { hasUsableLocalizedTitle, localizedDocsForLocale, publicFallbackLocale } from '@/lib/public-locale'
import { academyName } from '@/lib/short-name'
import { formatDateCompact } from '@/lib/time'
import { isSessionPast } from '@/lib/calendar'
import { toZonedTime, format as fmtTz } from 'date-fns-tz'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl, SITE_BASE } from '@/lib/site-config'
import { activityImageUrl } from '@/lib/activity-image'
import { activityShareImageUrl } from '@/lib/activity-share'
import ActivityImage from '@/components/activities/ActivityImage'
import { JsonLd } from '@/components/JsonLd'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { activitySeoDescription, activitySeoKeywords } from '@/lib/seo'
import type { Activity, Media, Category, Location } from '@/payload-types'
import { RichText } from '@/components/RichText'
import { ScrollToBooking } from '@/components/activities/ScrollToBooking'
import BookSessionButton from '@/components/booking/BookSessionButton'
import ShareButton from '@/components/activities/ShareButton'
import ImageCarousel from '@/components/activities/ImageCarousel'
import Image from 'next/image'
import { BAC_NINH_SLUG, bacNinhDetailTitle } from '@/lib/bac-ninh-seo'

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
    fallbackLocale: publicFallbackLocale(locale) as any,
    // depth 2 populates heroImage.cardCover, the only artwork shared publicly.
    depth: 2,
    overrideAccess: true,
    limit: 1,
  })
  const activity = result.docs[0] as Activity | undefined
  if (!activity || !hasUsableLocalizedTitle(activity.title, locale)) return {}
  const englishExists =
    locale === 'en' || (await hasEnglishVersion('activities', p.slug, location.id))

  const heroImgUrl = activityShareImageUrl(activity, locale, SITE_BASE)

  const displayName = academyName(location.city, location.name)
  const category =
    typeof activity.category === 'object' ? (activity.category as Category) : null
  const title =
    activity.seoTitle?.trim() ||
    (location.slug === BAC_NINH_SLUG
      ? bacNinhDetailTitle(locale, 'activity', activity.title)
      : pageTitle(locale, activity.title, displayName))
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
      ...(englishExists ? { en: locationUrl('en', p.loc, `/activities/${p.slug}`) } : {}),
    },
  })
}

const TZ = 'Asia/Bangkok'
const CJK = /[\u3400-\u9fff]/
/** Shared width so session actions line up with the article column. */
const COLUMN = 'max-w-[760px]'

// ─── Media helpers ─────────────────────────────────────────────────────────
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
  // A blank slug can never be a real page (see the Activities slug validation).
  if (!p.slug.trim()) notFound()

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
    fallbackLocale: publicFallbackLocale(locale) as any,
    depth: 2,
    overrideAccess: true,
    limit: 1,
  })

  const activity = result.docs[0] as Activity | undefined
  if (!activity) notFound()
  // The activity exists but has not been translated: send English visitors
  // (and stale links) to the English list instead of Chinese text on an /en URL.
  if (!hasUsableLocalizedTitle(activity.title, locale)) {
    redirect(locationPath(locale, locSlug, '/activities'))
  }

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
    fallbackLocale: publicFallbackLocale(locale) as any,
    depth: 2,
    limit: 20,
    overrideAccess: true,
  })
  const now = new Date()
  const sortedRelated = localizedDocsForLocale(relatedResult.docs, locale)
    .filter(hasUsableSlug)
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
  const isSeries = activity.registrationMode === 'series'
  const activeSeriesOccurrences = sortedOccurrences.filter((o) => o.status !== 'cancelled')
  const seriesAnchor = activeSeriesOccurrences[0] ?? null
  const seriesAnchorIndex = seriesAnchor ? sortedOccurrences.indexOf(seriesAnchor) : -1

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
  const seriesCapacity = seriesAnchorIndex >= 0 ? capacityResults[seriesAnchorIndex] : null

  // Next bookable session for the mobile sticky bar: upcoming, not
  // cancelled and not full. Series courses book through their anchor.
  const stickyBooking = (() => {
    if (isSeries) {
      if (!seriesAnchor || !seriesCapacity) return null
      if (isSessionPast(seriesAnchor.startAt, now)) return null
      if (seriesCapacity.remaining === 0 || seriesAnchor.status === 'full') return null
      return { occ: seriesAnchor, index: seriesAnchorIndex }
    }
    const index = sortedOccurrences.findIndex(
      (occ, i) =>
        occ.status !== 'cancelled' &&
        occ.status !== 'full' &&
        !isSessionPast(occ.startAt, now) &&
        capacityResults[i].remaining > 0,
    )
    return index >= 0 ? { occ: sortedOccurrences[index], index } : null
  })()

  const seriesSessionLabels = activeSeriesOccurrences.map((occ) =>
    isZh
      ? `${formatDayZh(new Date(occ.startAt))}（${formatWeekdayZh(new Date(occ.startAt))}）· ${formatTimeRange(occ.startAt, occ.endAt)}`
      : `${formatWeekdayEn(new Date(occ.startAt))}, ${formatDayEn(new Date(occ.startAt))} · ${formatTimeRange(occ.startAt, occ.endAt)}`,
  )

  // ─ Meta ─────────────────────────────────────────────────────────────
  const heroUrl = activityImageUrl(activity.heroImage, 'hero')
  const heroAlt = mediaAlt(activity.heroImage, activity.title)
  // Only recomposed artwork may appear in the public carousel.
  const carouselImages = [
    ...(heroUrl ? [{ url: heroUrl, alt: heroAlt }] : []),
    ...((activity.gallery ?? [])
      .map((g) => ({
        url: activityImageUrl((g as { image?: number | Media }).image, 'hero'),
        alt: mediaAlt((g as { image?: number | Media }).image, activity.title),
      }))
      .filter((im): im is { url: string; alt: string } => Boolean(im.url))),
  ]
  const category = typeof activity.category === 'object' ? (activity.category as Category) : null
  const categoryName = (category?.name as string | undefined) ?? ''
  const categoryUntranslated = !isZh && CJK.test(categoryName)
  const academyDisplayName = academyName(location.city, location.name)
  const academyShortLabel = splitPlaceName(academyDisplayName).primary
  const subtitle = activityExcerpt(activity.shortDesc, activity.title)
  const hasDescription = Boolean(activity.description)

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
    <div className={stickyBooking ? 'pb-24 md:pb-0' : undefined}>
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
        // Full-bleed band: a blurred copy of the first image fills the space
        // beside the 960px frame so wide screens don't show white gutters.
        <div className="relative overflow-hidden bg-ink/[0.06]">
          <Image
            src={carouselImages[0].url}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="pointer-events-none object-cover scale-110 blur-3xl opacity-50 saturate-[0.7]"
          />
          <ImageCarousel
            images={carouselImages}
            className="relative w-full max-w-[960px] mx-auto aspect-[3/2]"
            priority
            sizes="(min-width: 960px) 960px, 100vw"
          />
        </div>
      )}

      {/* ─── BREADCRUMB ───────────────────────────────────────────── */}
      <div className="px-[6vw] py-2 md:py-5 border-b border-hairline">
        <nav className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft flex items-center gap-2 flex-wrap">
          <Link href={locationPath(locale, locSlug)} className="inline-flex min-h-11 items-center text-ink-soft no-underline hover:text-ink transition-colors md:min-h-0">
            {academyShortLabel}
          </Link>
          <span>/</span>
          <Link href={locationPath(locale, locSlug, '/activities')} className="inline-flex min-h-11 items-center text-ink-soft no-underline hover:text-ink transition-colors md:min-h-0">
            {isZh ? '活动' : 'Activities'}
          </Link>
          <span>/</span>
          <span className="text-ink">{activity.title}</span>
        </nav>
      </div>

      {/* ─── ARTICLE WRAP ─────────────────────────────────────────── */}
      <div className={`px-[6vw] ${hasDescription ? 'py-16' : 'pt-16 pb-6'}`}>
        <div className={COLUMN}>
          {/* Eyebrow */}
          {categoryName && (
            <p
              lang={categoryUntranslated ? 'zh-CN' : undefined}
              className={`font-sans text-[11px] font-semibold ${isZh || categoryUntranslated ? 'tracking-[0.3em]' : 'tracking-[0.18em] uppercase'} text-ink-soft mb-5`}
            >
              {categoryName}
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
          {subtitle && (
            <p className="max-w-prose font-serif text-[18px] text-ink-soft leading-[1.55] mb-6">
              {subtitle}
            </p>
          )}

          {/* Meta strip */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mb-10 text-[13px] text-ink-soft font-sans">
            <span className="flex items-center gap-2">
              <span>📍</span>
              <span>
                {activity.venueNote ||
                  (isZh ? `${location.name}` : academyDisplayName)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span>👥</span>
              <span>
                {isZh
                  ? `${activity.capacity} ${t(locale, 'meta.spots')}${isSeries ? '（整期课程）' : ''}`
                  : `${activity.capacity} spots ${isSeries ? 'for the full course' : 'per session'}`}
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
          <div className={`${hasDescription ? 'mb-10' : ''} flex flex-wrap gap-3`}>
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
              title={pageTitle(locale, activity.title, academyDisplayName)}
              text={(activity.shortDesc as string | null | undefined) ?? undefined}
              locale={locale}
              variant="label"
            />
          </div>

          {/* Long body */}
          {activity.description && (
            <div className="max-w-prose font-sans text-[15px] text-ink leading-[1.8] mb-4">
              <RichText data={activity.description} />
            </div>
          )}
        </div>
      </div>

      {/* ─── SESSIONS ─────────────────────────────────────────────── */}
      <section
        id="sessions"
        className="px-[6vw] py-12 md:py-16 border-t border-hairline scroll-mt-20"
      >
        <div className={COLUMN}>
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-6 md:mb-8">
            {t(locale, 'eyebrow.sessions')}
          </p>

          {sortedOccurrences.length > 0 ? (
            <div>
              {isSeries && (
                <div className="mb-8 rounded border border-sky/45 bg-sky/[0.09] px-5 py-4">
                  <p className="font-serif text-[18px] text-ink mb-1.5">
                    {isZh
                      ? `这是一个完整的系列课程，共 ${activeSeriesOccurrences.length} 次课`
                      : `This is one complete course with ${activeSeriesOccurrences.length} sessions`}
                  </p>
                  <p className="font-sans text-[13px] text-ink-soft leading-[1.7]">
                    {isZh
                      ? '一次报名涵盖全部课次。为保障课程体验，请确认能够参加全部课程后再报名。'
                      : 'One registration covers every session. Please book only if you can attend the complete course.'}
                  </p>
                </div>
              )}

              <div className="flex flex-col divide-y divide-hairline">
                {sortedOccurrences.map((occ, i) => {
                  const { remaining } = capacityResults[i]
                  const isFull = remaining === 0 || occ.status === 'full'
                  const occId = occ.id ?? `occ-${i}`
                  const seriesPosition = activeSeriesOccurrences.indexOf(occ)
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

                      <div className="flex-1">
                        <span className="font-sans text-[13px] text-ink-soft block">
                          {activity.venueNote ||
                            (isZh ? location.name : academyDisplayName)}
                        </span>
                        {isSeries ? (
                          <span className="font-sans text-[12px] font-semibold text-ink-soft block mt-1">
                            {occ.status === 'cancelled'
                              ? (isZh ? '本次课程已取消' : 'This session is cancelled')
                              : isZh
                                ? `完整课程 · 第 ${seriesPosition + 1} 次`
                                : `Full course · Session ${seriesPosition + 1}`}
                          </span>
                        ) : (
                          <span
                            className={[
                              'font-sans text-[12px] block mt-1',
                              remaining > 0 && remaining <= 3 ? 'text-clay font-semibold' : 'text-ink-soft',
                            ].join(' ')}
                          >
                            {occ.status === 'full' ? t(locale, 'meta.full') : remainingSeatsText(locale, remaining)}
                          </span>
                        )}
                      </div>

                      <div className="flex-none sm:ml-auto">
                        {isSeries ? (
                          <span className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/25 rounded-full px-4 py-[0.4rem]">
                            {isSessionPast(occ.startAt, now)
                              ? (isZh ? '已结束' : 'Ended')
                              : occ.status === 'cancelled'
                                ? (isZh ? '已取消' : 'Cancelled')
                                : (isZh ? `第 ${seriesPosition + 1} 次` : `Session ${seriesPosition + 1}`)}
                          </span>
                        ) : isSessionPast(occ.startAt, now) ? (
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

              {isSeries && seriesAnchor && seriesCapacity && (
                <div className="mt-8 flex flex-col gap-4 rounded border border-ink/15 bg-sky/[0.04] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-[18px] text-ink mb-1">
                      {isZh ? '一次报名，参加全部课次' : 'One registration for the complete course'}
                    </p>
                    <p className="font-sans text-[12px] text-ink-soft">
                      {seriesAnchor.status === 'full'
                        ? t(locale, 'meta.full')
                        : remainingSeatsText(locale, seriesCapacity.remaining)}
                    </p>
                  </div>
                  {isSessionPast(seriesAnchor.startAt, now) ? (
                    <span className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/30 rounded-full px-5 py-[0.55rem] text-center">
                      {isZh ? '报名已截止' : 'Registration closed'}
                    </span>
                  ) : (
                    <BookSessionButton
                      activityId={activity.id}
                      activitySlug={activity.slug}
                      activityTitle={activity.title}
                      occurrenceId={seriesAnchor.id ?? 'series'}
                      sessionLabel={isZh ? `完整系列课程 · 共 ${activeSeriesOccurrences.length} 次` : `Complete course · ${activeSeriesOccurrences.length} sessions`}
                      seriesSessionLabels={seriesSessionLabels}
                      requiresFullAttendance
                      requiresChineseProficiency={Boolean(activity.requiresChineseProficiency)}
                      locationId={location.id}
                      locationSlug={locSlug}
                      locationName={academyDisplayName}
                      locationWechatId={(location as any).wechatId ?? undefined}
                      locale={locale}
                      source={srcParam}
                      isFull={seriesCapacity.remaining === 0 || seriesAnchor.status === 'full'}
                    />
                  )}
                </div>
              )}
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
          <div className={COLUMN}>
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
              const imgUrl = activityImageUrl(rel.heroImage)
              const imgAlt = mediaAlt(rel.heroImage, rel.title)
              const upcoming = nextOccurrenceDate(rel)
              const relExcerpt = activityExcerpt(rel.shortDesc, rel.title)

              return (
                <Link
                  key={rel.id}
                  href={locationPath(locale, locSlug, `/activities/${rel.slug}`)}
                  className="flex h-full min-w-0 flex-col no-underline text-inherit group"
                >
                  {imgUrl ? (
                    <ActivityImage
                      src={imgUrl}
                      alt={imgAlt}
                      width={900}
                      height={600}
                      sizes="(min-width: 768px) 44vw, 88vw"
                    />
                  ) : (
                    <div className="w-full aspect-[3/2] bg-ink/15" />
                  )}
                  <div className="flex flex-1 flex-col pt-5 pb-6 pr-6 border-t border-hairline">
                    {upcoming && (
                      <p className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-soft mb-2">
                        {formatDateCompact(new Date(upcoming), locale)}
                      </p>
                    )}
                    <h3 className="font-serif text-[20px] font-medium text-ink mb-2">
                      {rel.title}
                    </h3>
                    {relExcerpt && (
                      <p className="font-sans text-[13px] text-ink-soft mb-4 leading-[1.6] line-clamp-2">
                        {relExcerpt}
                      </p>
                    )}
                    <span className="mt-auto font-sans text-[12px] font-semibold text-blue-deep tracking-[0.04em] transition-colors duration-150 group-hover:text-ink">
                      {t(locale, 'cta.view_details')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── MOBILE STICKY BOOKING BAR ───────────────────────────── */}
      {stickyBooking && (
        <div data-sticky-booking className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-paper/95 backdrop-blur-sm px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[10px] font-semibold tracking-[0.14em] uppercase text-ink-soft">
                {isSeries
                  ? (isZh ? `系列课 · 共 ${activeSeriesOccurrences.length} 次` : `${activeSeriesOccurrences.length}-session course`)
                  : t(locale, 'cta.next_label')}
              </p>
              <p className="font-serif text-[16px] text-ink leading-tight truncate">
                {isZh
                  ? `${formatDayZh(new Date(stickyBooking.occ.startAt))}（${formatWeekdayZh(new Date(stickyBooking.occ.startAt))}）${formatTimeRange(stickyBooking.occ.startAt, stickyBooking.occ.endAt).split(' – ')[0]}`
                  : `${formatWeekdayEn(new Date(stickyBooking.occ.startAt)).slice(0, 3)}, ${formatDayEn(new Date(stickyBooking.occ.startAt))} · ${formatTimeRange(stickyBooking.occ.startAt, stickyBooking.occ.endAt).split(' – ')[0]}`}
              </p>
            </div>
            <BookSessionButton
              activityId={activity.id}
              activitySlug={activity.slug}
              activityTitle={activity.title}
              occurrenceId={stickyBooking.occ.id ?? `occ-${stickyBooking.index}`}
              sessionLabel={
                isSeries
                  ? (isZh ? `完整系列课程 · 共 ${activeSeriesOccurrences.length} 次` : `Complete course · ${activeSeriesOccurrences.length} sessions`)
                  : isZh
                    ? `${formatDayZh(new Date(stickyBooking.occ.startAt))}(${formatWeekdayZh(new Date(stickyBooking.occ.startAt))}) · ${formatTimeRange(stickyBooking.occ.startAt, stickyBooking.occ.endAt)}`
                    : `${formatWeekdayEn(new Date(stickyBooking.occ.startAt))} ${formatDayEn(new Date(stickyBooking.occ.startAt))} · ${formatTimeRange(stickyBooking.occ.startAt, stickyBooking.occ.endAt)}`
              }
              seriesSessionLabels={isSeries ? seriesSessionLabels : undefined}
              requiresFullAttendance={isSeries || undefined}
              requiresChineseProficiency={isSeries ? Boolean(activity.requiresChineseProficiency) : undefined}
              locationId={location.id}
              locationSlug={locSlug}
              locationName={academyDisplayName}
              locationWechatId={(location as any).wechatId ?? undefined}
              locale={locale}
              source={srcParam}
              isFull={false}
              label={isZh ? '立即报名' : 'Book now'}
              className="px-6 text-[12px]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
