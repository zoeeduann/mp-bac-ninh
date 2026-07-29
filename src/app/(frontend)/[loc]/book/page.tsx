import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  getLocationBySlug,
  getThailandNetworkLocations,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import { getLocale, t } from '@/lib/i18n'
import { getUpcomingSessionsForLocation } from '@/lib/content'
import { academyName } from '@/lib/short-name'
import { buildMetadata } from '@/lib/metadata'
import { locationUrl } from '@/lib/site-config'
import UpcomingSessionsList from '@/components/booking/UpcomingSessionsList'
import InquiryForm from '@/components/booking/InquiryForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ loc: string }>
}): Promise<Metadata> {
  const p = await params
  const locale = await getLocale()
  const location = await getLocationBySlug(p.loc, locale)
  if (!location) return {}

  const displayName = academyName(location.city, location.name)
  const siteName = locationSiteName(location, locale)
  const title = locale === 'zh-CN'
    ? `预约 — ${displayName}`
    : `Book a Session — ${displayName}`
  const description = locale === 'zh-CN'
    ? `预约${displayName}的禅修、工作坊或茶会，或留言咨询。`
    : `Reserve a meditation session, workshop, or tea gathering at ${displayName}. Free inquiry welcome.`

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc, '/book'),
    locale,
    siteName,
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, '/book'),
      en: locationUrl('en', p.loc, '/book'),
    },
  })
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ loc: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [p, sp] = await Promise.all([params, searchParams])

  const locSlug = p.loc

  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  const [location, allLocations] = await Promise.all([
    getLocationBySlug(locSlug, locale),
    getThailandNetworkLocations(locale),
  ])
  if (!location) notFound()
  const bookingLocations = isThailandNetworkLocation(location)
    ? allLocations
    : [location]

  const upcomingSessions = await getUpcomingSessionsForLocation(location.id, locale, 8)

  // Parse search params for auto-open modal
  const rawActivity = sp['activity']
  const activityParam = (Array.isArray(rawActivity) ? rawActivity[0] : rawActivity) ?? null
  const rawOcc = sp['occ']
  const occParam = (Array.isArray(rawOcc) ? rawOcc[0] : rawOcc) ?? null
  const rawSrc = sp['src']
  const srcRaw = (Array.isArray(rawSrc) ? rawSrc[0] : rawSrc) ?? 'book_list'
  const srcParam: 'activity_detail' | 'book_list' | 'shared_link' =
    srcRaw === 'shared_link' ? 'shared_link' : srcRaw === 'activity_detail' ? 'activity_detail' : 'book_list'

  const academyDisplayName = academyName(location.city, location.name)

  // Serialize sessions for client component
  const sessionRows = upcomingSessions.map((s) => ({
    activityId: s.activity.id,
    activitySlug: s.activity.slug,
    activityTitle: s.activity.title as string,
    occurrenceId: s.occurrence.id,
    startAt: s.occurrence.startAt,
    endAt: s.occurrence.endAt,
    capacityOverride: s.occurrence.capacityOverride ?? null,
    activityCapacity: s.activity.capacity as number,
    remaining: s.remaining,
    locationId: location.id,
    locationSlug: locSlug,
    locationName: academyDisplayName,
    locationWechatId: (location as any).wechatId ?? null,
    locationWhatsapp: (location as any).whatsapp ?? null,
  }))

  // Serialize locations for InquiryForm
  const locationOptions = bookingLocations.map((loc: any) => ({
    id: loc.id as number,
    slug: loc.slug as string,
    name: loc.name as string,
    city: loc.city as string,
    wechatId: loc.wechatId as string | null | undefined,
    whatsapp: loc.whatsapp as string | null | undefined,
  }))

  return (
    <div>
      {/* ─── PAGE HEADER BAND ──────────────────────────────────────────── */}
      <div
        className="px-[6vw] border-b border-hairline"
        style={{ paddingTop: '8rem', paddingBottom: '5rem' }}
      >
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-[1.2rem]">
          {t(locale, 'eyebrow.book')}
        </p>
        <h1
          className="font-serif font-normal text-ink leading-[1.15] mb-[0.7rem]"
          style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}
        >
          {t(locale, 'section.book_title')}
        </h1>
        <p className="font-serif text-ink-soft" style={{ fontSize: 'clamp(18px, 2vw, 24px)' }}>
          {isZh
            ? `在 ${academyDisplayName}`
            : `at ${academyDisplayName}`}
        </p>
      </div>

      {/* ─── UPCOMING SESSIONS SECTION ─────────────────────────────────── */}
      <section className="px-[6vw] py-[5rem_6vw_6rem] border-b border-hairline">
        <div style={{ paddingTop: '5rem', paddingBottom: '6rem' }}>
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-[3rem]">
            {t(locale, 'eyebrow.upcoming')}
          </p>
          <UpcomingSessionsList
            sessions={sessionRows}
            locale={locale}
            autoOpen={{
              activitySlug: activityParam,
              occurrenceId: occParam,
              source: srcParam,
            }}
          />
        </div>
      </section>

      {/* ─── SECTION BREAK BAND ────────────────────────────────────────── */}
      {/* VI A-13 "渐变蓝营造禅意氛围" — pale→mid→sky horizontal gradient.
          border-t intentionally dropped: previous section already has border-b. */}
      <div className="bg-gradient-to-r from-sky-pale via-sky-mid/40 to-sky-pale border-b border-hairline px-[6vw] py-[5rem] text-center">
        <p className="font-sans text-[11px] font-semibold tracking-[0.22em] uppercase text-blue-deep">
          {t(locale, 'section.no_fit')}
        </p>
      </div>

      {/* ─── FREE INQUIRY SECTION ──────────────────────────────────────── */}
      <section id="inquiry" className="px-[6vw]" style={{ paddingTop: '5.5rem', paddingBottom: '9rem' }}>
        <div className="max-w-[600px] mx-auto">
          {/* Header */}
          <div className="mb-[4rem]">
            <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-[1.2rem]">
              {t(locale, 'eyebrow.free_inquiry')}
            </p>
            <h2
              className="font-serif font-normal text-ink leading-[1.2] mb-[0.7rem]"
              style={{ fontSize: 'clamp(26px, 3.5vw, 42px)' }}
            >
              {t(locale, 'section.leave_note')}
            </h2>
            <p className="font-serif text-[18px] text-ink-soft leading-[1.55]">
              {isZh
                ? '约一对一指导、参观学堂，或者其他咨询。'
                : 'Reach out for one-on-one guidance, a visit, or anything else.'}
            </p>
          </div>

          {/* Form */}
          <InquiryForm
            locations={locationOptions}
            defaultLocationId={location.id}
            locale={locale}
          />
        </div>
      </section>
    </div>
  )
}
