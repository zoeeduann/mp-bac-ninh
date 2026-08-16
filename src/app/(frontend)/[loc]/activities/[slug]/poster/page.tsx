/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { getLocationBySlug, locationSiteName } from '@/lib/current-location'
import { getLocale, t } from '@/lib/i18n'
import { getPayloadClient } from '@/lib/payload'
import { getCapacityForOccurrence } from '@/lib/content'
import { academyName } from '@/lib/short-name'
import { toZonedTime, format as fmtTz } from 'date-fns-tz'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl, SITE_BASE } from '@/lib/site-config'
import type { Activity, Media, Category } from '@/payload-types'
import BookSessionButton from '@/components/booking/BookSessionButton'
import ShareButton from '@/components/activities/ShareButton'
import PosterControls from '@/components/activities/PosterControls'
import QRCode from 'qrcode'
import { buildPosterQrTarget } from '@/lib/poster-download'
import { fetchInlineImage } from '@/lib/poster-image'
import TrackedLink from '@/components/analytics/TrackedLink'

const TZ = 'Asia/Bangkok'

// ─── Helpers ────────────────────────────────────────────────────────────────
function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return (img as Media).url ?? null
}
function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return (img as Media).alt ?? fallback
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

function formatSessionLine(startAt: string, endAt: string, isZh: boolean): string {
  const z = toZonedTime(new Date(startAt), TZ)
  const time = `${fmtTz(z, 'HH:mm', { timeZone: TZ })}–${fmtTz(toZonedTime(new Date(endAt), TZ), 'HH:mm', { timeZone: TZ })}`
  if (isZh) {
    return `${fmtTz(z, 'M月d日', { timeZone: TZ })} 周${WEEKDAY_ZH[z.getDay()]} · ${time}`
  }
  return `${fmtTz(z, 'EEE, MMM d', { timeZone: TZ })} · ${time}`
}

/** Earliest non-cancelled future occurrence, or null. */
function nextOccurrence(activity: Activity) {
  const now = Date.now()
  return (
    (activity.occurrences ?? [])
      .filter(
        (o) =>
          o.startAt &&
          o.status !== 'cancelled' &&
          o.status !== 'deleted' &&
          new Date(o.startAt).getTime() > now,
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null
  )
}

async function fetchActivity(locId: number, slug: string, locale: string) {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'activities',
    where: {
      and: [
        { slug: { equals: slug } },
        { location: { equals: locId } },
        { status: { equals: 'published' } },
      ],
    },
    locale: locale as any,
    fallbackLocale: 'zh-CN' as any,
    depth: 2,
    overrideAccess: true,
    limit: 1,
  })
  return result.docs[0] as Activity | undefined
}

// ─── Metadata (OG = hero, so the shared link previews as a poster card) ──────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ loc: string; slug: string }>
}): Promise<Metadata> {
  const p = await params
  const locale = await getLocale()
  const location = await getLocationBySlug(p.loc, locale)
  if (!location) return {}
  const activity = await fetchActivity(location.id, p.slug, locale)
  if (!activity) return {}

  const heroImgUrl = mediaUrl(activity.heroImage) ?? undefined
  const displayName = academyName(location.city, location.name)
  const description =
    (activity.shortDesc as string | null | undefined) ??
    (locale === 'zh-CN'
      ? `在${displayName}参加「${activity.title}」。`
      : `Join "${activity.title}" at ${displayName}.`)

  return buildMetadata({
    title: `${activity.title} — ${displayName}`,
    description,
    url: locationUrl(locale, p.loc, `/activities/${p.slug}/poster`),
    imageUrl: heroImgUrl,
    locale,
    siteName: locationSiteName(location, locale),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, `/activities/${p.slug}/poster`),
      en: locationUrl('en', p.loc, `/activities/${p.slug}/poster`),
    },
  })
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function ActivityPosterPage({
  params,
}: {
  params: Promise<{ loc: string; slug: string }>
}) {
  const p = await params
  const locSlug = p.loc

  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  const location = await getLocationBySlug(locSlug, locale)
  if (!location) notFound()

  // Single-language poster: follows the page locale. Viewers switch via the
  // header language toggle (shared links default to zh-CN like the rest of
  // the site).
  const activity = await fetchActivity(location.id, p.slug, locale)
  if (!activity) notFound()

  const heroUrl = mediaUrl(activity.heroImage)
  const heroAlt = mediaAlt(activity.heroImage, activity.title)
  // Hero + gallery merged into one swipeable carousel.
  // Poster hero: inline as a data URL on the server so html-to-image can
  // capture it on iOS Safari (see fetchInlineImage docstring). The poster
  // intentionally renders a single static hero — it's a promo card, not a
  // browseable gallery; the gallery still lives on the activity detail page.
  const inlineHeroDataUrl = heroUrl ? await fetchInlineImage(heroUrl) : null
  const category = typeof activity.category === 'object' ? (activity.category as Category) : null
  const academyDisplayName = academyName(location.city, location.name)

  // Venue line + Google Maps deep-link. Prefer the activity's venueNote,
  // else the academy's full address; link out to a Maps search for it.
  const venueText =
    (activity.venueNote as string | null | undefined) ||
    (location.address as string | null | undefined) ||
    `${academyDisplayName} · ${location.city}`
  const mapsQuery = (location.address as string | null | undefined) || venueText
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`

  const occ = nextOccurrence(activity)
  const occId = occ?.id ?? ''
  const sessionLabel =
    occ && occ.startAt && occ.endAt ? formatSessionLine(occ.startAt, occ.endAt, isZh) : ''

  // Capacity for the next occurrence (drives the Full state)
  let isFull = false
  if (occ && occId) {
    const cap = await getCapacityForOccurrence(
      activity.id,
      occId,
      occ.capacityOverride ?? activity.capacity,
    )
    isFull = cap.remaining === 0
  }

  const posterPath = locationPath(locale, locSlug, `/activities/${p.slug}/poster`)
  const detailPath = locationPath(locale, locSlug, `/activities/${p.slug}`)

  // QR code: scan to land on the booking modal for the next session (via
  // UpcomingSessionsList autoOpen). Generated as a data URL on the server so
  // it's part of the captured DOM at html-to-image time — no client fetch,
  // no CORS issue.
  const qrTarget = buildPosterQrTarget({
    base: SITE_BASE,
    locSlug,
    activitySlug: p.slug,
    occurrenceId: occ && occId ? occId : null,
    locale,
  })
  const qrDataUrl = await QRCode.toDataURL(qrTarget, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#2A2A33', light: '#FFFFFF' },
  })

  return (
    <div className="min-h-svh bg-gradient-to-b from-sky-pale via-paper to-sky-pale flex flex-col items-center px-4 py-10 pt-24">
      {/* Download control rendered OUTSIDE the captured node so it doesn't
          appear in the resulting PNG. Auto-fires if URL has ?autodownload=1. */}
      <div className="w-full max-w-[460px] mb-4 flex justify-end">
        <PosterControls
          activitySlug={p.slug}
          targetId="poster-card"
          locale={locale}
        />
      </div>
      <div
        id="poster-card"
        className="w-full max-w-[460px] bg-paper rounded-2xl overflow-hidden border border-hairline shadow-[0_10px_40px_rgba(42,42,51,0.08)]"
      >
        {/* Brand bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 leading-none">
            <img src="/brand/bodhi-leaf.svg" alt="" aria-hidden="true" className="h-7 w-auto" />
            <span className="font-serif text-[15px] text-ink">
              静心学堂 · {location.city}
            </span>
          </div>
          <ShareButton
            url={posterPath}
            title={`${activity.title} — ${academyDisplayName}`}
            text={(activity.shortDesc as string | null | undefined) ?? undefined}
            locale={locale}
            variant="icon"
          />
        </div>

        {/* Hero — inline data URL so iOS Safari captures it. Single static
            image (no carousel) is intentional: the poster is a promo card. */}
        {inlineHeroDataUrl ? (
          <img
            src={inlineHeroDataUrl}
            alt={heroAlt}
            className="block w-full aspect-[4/5] object-cover"
          />
        ) : (
          <div className="relative aspect-[4/5] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-pale to-sky" />
          </div>
        )}

        {/* Body */}
        <div className="px-7 pt-7 pb-8">
          {category && (
            <p
              className={`font-sans text-[11px] font-semibold ${isZh ? 'tracking-[0.3em]' : 'tracking-[0.18em] uppercase'} text-sky mb-3`}
            >
              {category.name as string}
            </p>
          )}

          <h1
            className="font-serif font-normal text-ink leading-[1.2] mb-4"
            style={{ fontSize: 'clamp(26px, 6vw, 34px)' }}
          >
            {activity.title}
          </h1>

          {/* Session + location */}
          <div className="flex flex-col gap-2 mb-5">
            {sessionLabel ? (
              <p className="font-sans text-[14px] text-ink flex items-center gap-2">
                <span aria-hidden="true">🗓</span>
                {sessionLabel}
              </p>
            ) : (
              <p className="font-sans text-[14px] text-ink-soft">
                {t(locale, 'poster.no_sessions')}
              </p>
            )}
            <TrackedLink
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              analyticsEvent="map_open"
              analyticsParameters={{ location_slug: locSlug }}
              className="font-sans text-[14px] text-ink-soft flex items-start gap-2 no-underline transition-colors duration-150 hover:text-sky group"
            >
              <span aria-hidden="true" className="leading-[1.5]">📍</span>
              <span className="underline decoration-ink-soft/30 underline-offset-2 group-hover:decoration-sky">
                {venueText}
              </span>
            </TrackedLink>
          </div>

          {activity.shortDesc && (
            <p className="font-serif text-[16px] text-ink leading-[1.7] mb-7 whitespace-pre-line">
              {activity.shortDesc}
            </p>
          )}

          {/* Register */}
          <div className="flex flex-col items-stretch gap-3">
            {occ && occId ? (
              <BookSessionButton
                activityId={activity.id}
                activitySlug={activity.slug}
                activityTitle={activity.title}
                occurrenceId={occId}
                sessionLabel={sessionLabel}
                locationId={location.id}
                locationSlug={locSlug}
                locationName={academyDisplayName}
                locationWechatId={location.wechatId ?? undefined}
                locale={locale}
                source="shared_link"
                isFull={isFull}
              />
            ) : (
              <Link
                href={locationPath(locale, locSlug, '/activities')}
                className="font-sans text-[12px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky rounded-full px-6 py-3 no-underline text-center transition-colors duration-150 hover:bg-blue-deep hover:text-paper"
              >
                {t(locale, 'cta.all_activities')}
              </Link>
            )}

            {/* Scan-to-book QR. The poster's main reason for existing —
                someone snaps it from a WeChat group, points their phone at
                the QR, and lands on the booking modal for this session. */}
            <div className="flex items-center justify-center gap-4 pt-4 mt-2 border-t border-hairline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt=""
                aria-hidden="true"
                width={96}
                height={96}
                className="w-24 h-24 rounded-md"
              />
              <div className="flex flex-col text-left">
                <span className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft">
                  {isZh ? '扫码报名' : 'Scan to book'}
                </span>
                <span className="font-serif text-[14px] text-ink mt-1">
                  {isZh ? '直达预约表单' : 'Goes straight to the form'}
                </span>
              </div>
            </div>

            <Link
              href={detailPath}
              className="font-sans text-[12px] font-semibold tracking-[0.06em] text-sky no-underline text-center transition-colors duration-150 hover:text-ink"
            >
              {t(locale, 'poster.view_detail')} →
            </Link>
          </div>
        </div>

        {/* Footer mark */}
        <div className="border-t border-hairline px-7 py-5 flex items-center justify-center gap-2">
          <img src="/brand/bodhi-leaf.svg" alt="" aria-hidden="true" className="h-5 w-auto opacity-70" />
          <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-soft">
            Mindful Peace Academy
          </span>
        </div>
      </div>
    </div>
  )
}
