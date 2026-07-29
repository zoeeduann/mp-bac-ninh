import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'

import {
  getLocationBySlug,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import { getLocale, t } from '@/lib/i18n'
import {
  getAllPublishedActivitiesForLocation,
  getCategoriesWithCountsForLocation,
} from '@/lib/content'
import { academyName } from '@/lib/short-name'
import { formatDateCompact } from '@/lib/time'
import {
  buildMonthGrid,
  buildTwoWeekGrid,
  groupOccurrencesByDay,
  formatYMD,
  parseMonthParam,
  parseWeekStartParam,
  mondayOfWeek,
  isSessionPast,
} from '@/lib/calendar'
import { toZonedTime } from 'date-fns-tz'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl } from '@/lib/site-config'
import { JsonLd } from '@/components/JsonLd'
import { itemListJsonLd } from '@/lib/jsonld'
import { locationSeoKeywords } from '@/lib/seo'
import type { Media, Activity } from '@/payload-types'
import { ViewToggle } from '@/components/activities/ViewToggle'
import { CalendarDayLink } from '@/components/activities/CalendarDayLink'
import ShareButton from '@/components/activities/ShareButton'

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
  const inThailandNetwork = isThailandNetworkLocation(location)
  const title = locale === 'zh-CN'
    ? `活动 — ${displayName}`
    : `Activities — ${displayName}`
  const description = locale === 'zh-CN'
    ? `${displayName}的全部活动：佛学、禅修、正念、静坐、工作坊、茶会与共修。查看日程并预约。`
    : `All activities at ${displayName}: Buddhism, Zen meditation, mindfulness, workshops, tea gatherings, and community sits.`

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc, '/activities'),
    locale,
    siteName: locationSiteName(location, locale),
    keywords: locationSeoKeywords(locale, location.city, displayName, [
      locale === 'zh-CN' ? '禅修活动' : 'meditation classes',
      locale === 'zh-CN' ? '佛学活动' : 'Buddhist practice',
      locale === 'zh-CN' ? '正念课程' : 'mindfulness classes',
    ], inThailandNetwork),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, '/activities'),
      en: locationUrl('en', p.loc, '/activities'),
    },
  })
}

const TZ = 'Asia/Bangkok'

// ─── Category color map for calendar chips ────────────────────────────────
// Palette anchored to VI A-13. Cool tones for sitting/study (sky + sky-mid),
// warm tones for tea/workshop/community (clay/sand), neutrals for solitary/residential.
function chipColorForCategory(slug: string): { bg: string; text: string } {
  switch (slug) {
    case 'meditation-class':
      return { bg: 'bg-sky', text: 'text-ink' }
    case 'community-practice':
    case 'mindful-activity':
      return { bg: 'bg-sky-mid', text: 'text-ink' }
    case 'tea-gathering':
      return { bg: 'bg-clay', text: 'text-paper' }     // 茶色 — tea sessions
    case 'workshop':
      return { bg: 'bg-sand', text: 'text-paper' }     // 沉香 — workshops
    case 'one-on-one':
      return { bg: 'bg-ink-soft', text: 'text-paper' }
    case 'residential':
      return { bg: 'bg-ink', text: 'text-paper' }
    // Legacy Chinese romanization slugs
    case 'gonxiu':
    case 'chenxiu':
      return { bg: 'bg-sky-mid', text: 'text-ink' }
    case 'chanjiu':
    case 'chanhui':
      return { bg: 'bg-sky', text: 'text-ink' }
    case 'chahui':
      return { bg: 'bg-clay', text: 'text-paper' }
    case 'gongzuofang':
      return { bg: 'bg-sand', text: 'text-paper' }
    default:
      return { bg: 'bg-ink-soft', text: 'text-paper' }
  }
}

// ─── Media helpers ─────────────────────────────────────────────────────────
function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return (img as Media).url ?? null
}
function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return (img as Media).alt ?? fallback
}

/** Find the first upcoming occurrence's startAt for an activity */
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
export default async function ActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ loc: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [p, sp] = await Promise.all([params, searchParams])

  const slug = p.loc

  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  const location = await getLocationBySlug(slug, locale)
  if (!location) notFound()

  // ─ Query params ──────────────────────────────────────────────────────
  const rawView = sp['view']
  const view: 'list' | 'calendar' =
    (Array.isArray(rawView) ? rawView[0] : rawView) === 'calendar'
      ? 'calendar'
      : 'list'

  const rawCat = sp['cat']
  const activeCat = (Array.isArray(rawCat) ? rawCat[0] : rawCat) ?? null

  const rawMonth = sp['month']
  const monthParam = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth

  const rawDay = sp['day']
  const selectedDay = (Array.isArray(rawDay) ? rawDay[0] : rawDay) ?? null

  // ─ Data fetching ─────────────────────────────────────────────────────
  const [allActivities, categories] = await Promise.all([
    getAllPublishedActivitiesForLocation(location.id, locale),
    getCategoriesWithCountsForLocation(location.id, locale),
  ])

  // Filter by category if active
  const filteredActivities = activeCat
    ? allActivities.filter((a: any) => {
        const catSlug =
          typeof a.category === 'object' ? a.category?.slug : null
        return catSlug === activeCat
      })
    : allActivities

  // Sort for the list view: soonest-upcoming first, activities with no
  // future session sink to the bottom (same comparator as the detail page's
  // related-activities block). Calendar view derives its own ordering from
  // groupOccurrencesByDay below, so this sort affects the list only.
  const sortedActivities = [...filteredActivities]
    .map((a: any) => ({ a, next: nextOccurrenceDate(a) }))
    .sort((x, y) => {
      if (!x.next && !y.next) return 0
      if (!x.next) return 1
      if (!y.next) return -1
      return new Date(x.next).getTime() - new Date(y.next).getTime()
    })
    .map((x) => x.a)

  // ─ Calendar grid ─────────────────────────────────────────────────────
  const today = new Date()
  const todayZoned = toZonedTime(today, TZ)
  const defaultYear = todayZoned.getFullYear()
  const defaultMonth0 = todayZoned.getMonth()

  const parsed = monthParam ? parseMonthParam(monthParam) : null
  const calYear = parsed ? parsed.year : defaultYear
  const calMonth0 = parsed ? parsed.month0 : defaultMonth0

  const calGrid = buildMonthGrid(calYear, calMonth0, today)
  const occByDay = groupOccurrencesByDay(allActivities as any[])

  // Prev / next month links
  function monthParamFor(y: number, m0: number) {
    const mm = String(m0 + 1).padStart(2, '0')
    return `${y}-${mm}`
  }
  const prevM = calMonth0 === 0 ? { y: calYear - 1, m: 11 } : { y: calYear, m: calMonth0 - 1 }
  const nextM = calMonth0 === 11 ? { y: calYear + 1, m: 0 } : { y: calYear, m: calMonth0 + 1 }

  function calNavHref(y: number, m0: number) {
    const params = new URLSearchParams()
    params.set('view', 'calendar')
    if (activeCat) params.set('cat', activeCat)
    params.set('month', monthParamFor(y, m0))
    return locationPath(locale, slug, `/activities?${params.toString()}`)
  }

  // ─ Mobile 2-week grid (independent of the desktop month nav) ────────
  // weekStart param overrides; default is the Monday of today's week (BKK).
  const rawWeekStart = sp['weekStart']
  const weekStartParam =
    (Array.isArray(rawWeekStart) ? rawWeekStart[0] : rawWeekStart) ?? null
  const parsedWeekStart = weekStartParam
    ? parseWeekStartParam(weekStartParam)
    : null
  const twoWeekStartDate = parsedWeekStart ?? mondayOfWeek(today)
  const twoWeekGrid = buildTwoWeekGrid(twoWeekStartDate, today)
  // Two-week prev/next windows
  const prevWeekStart = new Date(twoWeekStartDate)
  prevWeekStart.setDate(twoWeekStartDate.getDate() - 14)
  const nextWeekStart = new Date(twoWeekStartDate)
  nextWeekStart.setDate(twoWeekStartDate.getDate() + 14)
  const twoWeekEndDate = new Date(twoWeekStartDate)
  twoWeekEndDate.setDate(twoWeekStartDate.getDate() + 13)

  function weekNavHref(startDate: Date) {
    const params = new URLSearchParams()
    params.set('view', 'calendar')
    if (activeCat) params.set('cat', activeCat)
    params.set('weekStart', formatYMD(toZonedTime(startDate, TZ)))
    return locationPath(locale, slug, `/activities?${params.toString()}`)
  }

  // Activities on the selected day
  const selectedDayChips = selectedDay ? (occByDay.get(selectedDay) ?? []) : []
  const selectedDayActivities = selectedDayChips
    .map((chip) => allActivities.find((a: any) => a.slug === chip.activitySlug))
    .filter(Boolean) as Activity[]

  // Month heading labels
  const monthNames: [string, string][] = [
    ['1月', 'January'], ['2月', 'February'], ['3月', 'March'],
    ['4月', 'April'], ['5月', 'May'], ['6月', 'June'],
    ['7月', 'July'], ['8月', 'August'], ['9月', 'September'],
    ['10月', 'October'], ['11月', 'November'], ['12月', 'December'],
  ]
  const [monthZh, monthEn] = monthNames[calMonth0] ?? ['', '']

  const academyDisplayName = academyName(location.city, location.name)
  const activityListJsonLd = itemListJsonLd({
    name: isZh ? `${academyDisplayName}活动` : `${academyDisplayName} activities`,
    url: locationUrl(locale, slug, '/activities'),
    items: sortedActivities.slice(0, 24).map((actDoc: any) => {
      const act = actDoc as Activity & { heroImage: Media | number }
      return {
        name: act.title,
        url: locationUrl(locale, slug, `/activities/${act.slug}`),
        description: act.shortDesc,
        imageUrl: mediaUrl(act.heroImage),
      }
    }),
  })

  return (
    <div>
      {sortedActivities.length > 0 && <JsonLd data={activityListJsonLd} />}
      {/* ─── PAGE HEADER BAND ───────────────────────────────────────── */}
      <div
        className="px-[6vw] border-b border-hairline"
        style={{ paddingTop: '8rem', paddingBottom: '4.5rem' }}
      >
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
          {isZh
            ? `${location.name} · ${t(locale, 'eyebrow.activities')}`
            : `${academyDisplayName} · ${t(locale, 'eyebrow.activities')}`}
        </p>
        <h1
          className="font-serif font-normal text-ink leading-[1.2] mb-3"
          style={{ fontSize: 'clamp(28px, 4vw, 50px)' }}
        >
          {t(locale, 'section.few_ways_in')}
        </h1>
        <p className="font-serif text-[19px] text-ink-soft">
          {isZh
            ? '禅修、工作坊、茶会、共修——选一个适合你的节奏。'
            : 'Meditation, workshops, tea gatherings, community sits — find your pace.'}
        </p>
      </div>

      {/* ─── FILTER CHIPS ──────────────────────────────────────────── */}
      <div className="px-[6vw] py-10 border-b border-hairline flex flex-wrap gap-[0.6rem] items-center">
        {/* "All" chip */}
        <Link
          href={locationPath(locale, slug, `/activities${view === 'calendar' ? '?view=calendar' : ''}`)}
          className={[
            'font-sans text-[11px] font-semibold tracking-[0.12em] uppercase',
            'px-4 py-[0.45rem] rounded-full border-[1.5px] no-underline transition-all duration-150',
            !activeCat
              ? 'bg-sky border-sky text-ink ring-1 ring-blue-deep ring-offset-1'
              : 'border-ink/[0.18] text-ink hover:border-sky hover:text-sky',
          ].join(' ')}
        >
          {isZh ? '全部' : 'All'}
        </Link>

        {categories.map((cat) => {
          const href = locationPath(
            locale,
            slug,
            `/activities?cat=${cat.slug}${view === 'calendar' ? '&view=calendar' : ''}`,
          )
          const isActive = activeCat === cat.slug
          return (
            <Link
              key={cat.id}
              href={href}
              className={[
                'font-sans text-[11px] font-semibold tracking-[0.12em] uppercase',
                'px-4 py-[0.45rem] rounded-full border-[1.5px] no-underline transition-all duration-150',
                isActive
                  ? 'bg-sky border-sky text-ink ring-1 ring-blue-deep ring-offset-1 scale-[1.04]'
                  : 'border-ink/[0.18] text-ink hover:border-sky hover:text-sky',
              ].join(' ')}
            >
              {cat.name}
            </Link>
          )
        })}
      </div>

      {/* ─── GRID / CALENDAR SECTION ───────────────────────────────── */}
      <div className="px-[6vw] pt-10 pb-36">
        {/* View toggle row */}
        <div className="flex justify-end mb-10">
          <Suspense fallback={null}>
            <ViewToggle activeView={view} isZh={isZh} />
          </Suspense>
        </div>

        {/* ── LIST VIEW ─────────────────────────────────────────────── */}
        {view === 'list' && (
          <>
            <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-12">
              {t(locale, 'eyebrow.all_activities')}
            </p>

            {sortedActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
                {sortedActivities.map((actDoc: any) => {
                  const act = actDoc as Activity & { heroImage: Media | number }
                  const imgUrl = mediaUrl(act.heroImage)
                  const imgAlt = mediaAlt(act.heroImage, act.title)
                  const upcoming = nextOccurrenceDate(act)

                  return (
                    <Link
                      key={act.id}
                      href={locationPath(locale, slug, `/activities/${act.slug}`)}
                      className="block no-underline text-inherit group"
                    >
                      <div className="relative">
                        {imgUrl ? (
                          <Image
                            src={imgUrl}
                            alt={imgAlt}
                            width={700}
                            height={840}
                            className="w-full aspect-[5/6] object-cover saturate-[0.85] block"
                          />
                        ) : (
                          <div className="w-full aspect-[5/6] bg-ink/15" />
                        )}
                        {/* Share the activity poster — preventDefault keeps the
                            card link from firing */}
                        <ShareButton
                          url={locationPath(locale, slug, `/activities/${act.slug}/poster`)}
                          title={act.title as string}
                          text={(act.shortDesc as string | null | undefined) ?? undefined}
                          locale={locale}
                          variant="icon"
                          className="absolute top-3 right-3"
                        />
                      </div>
                      <div className="pt-5 pb-6 border-t border-hairline">
                        {upcoming ? (
                          <p className="font-sans text-[13px] font-semibold tracking-[0.14em] uppercase text-ink-soft mb-2">
                            {formatDateCompact(new Date(upcoming), locale)}
                          </p>
                        ) : (
                          <p className="font-sans text-[13px] font-semibold tracking-[0.14em] uppercase text-ink-soft mb-2">
                            {t(locale, 'meta.past')}
                          </p>
                        )}
                        <h3 className="font-serif text-[20px] font-medium text-ink mb-2">
                          {act.title}
                        </h3>
                        {act.shortDesc && (
                          <p className="font-sans text-[13px] text-ink-soft mb-4 leading-[1.6] whitespace-pre-line line-clamp-3">
                            {act.shortDesc}
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
            ) : (
              <div className="min-h-[40vh] flex items-center justify-center">
                <div className="text-center max-w-[320px]">
                  <p className="font-serif text-[20px] text-ink-soft/60 mb-3">
                    {isZh ? '本月暂无活动。' : 'No activities yet.'}
                  </p>
                  <p className="font-sans text-[13px] text-ink-soft">
                    {t(locale, 'meta.no_activities')}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CALENDAR VIEW ─────────────────────────────────────────── */}
        {view === 'calendar' && (
          <div>
            {/* ─── MOBILE 2-WEEK GRID (<md) ──────────────────────────── */}
            <div className="md:hidden">
              {/* Range header + week nav */}
              <div className="flex items-baseline justify-between mb-5">
                <span className="font-serif text-[16px] font-normal text-ink">
                  {(() => {
                    const s = toZonedTime(twoWeekStartDate, TZ)
                    const e = toZonedTime(twoWeekEndDate, TZ)
                    if (isZh) {
                      return `${s.getMonth() + 1}月${s.getDate()}日 – ${e.getMonth() + 1}月${e.getDate()}日`
                    }
                    const mAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                    return `${mAbbr[s.getMonth()]} ${s.getDate()} – ${mAbbr[e.getMonth()]} ${e.getDate()}`
                  })()}
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={weekNavHref(prevWeekStart)}
                    className="flex items-center justify-center w-[28px] h-[28px] rounded-full border border-hairline text-[13px] text-sky leading-none no-underline transition-colors duration-150 hover:border-sky hover:text-ink"
                    aria-label={isZh ? '上两周' : 'Previous 2 weeks'}
                  >
                    ←
                  </Link>
                  <Link
                    href={weekNavHref(nextWeekStart)}
                    className="flex items-center justify-center w-[28px] h-[28px] rounded-full border border-hairline text-[13px] text-sky leading-none no-underline transition-colors duration-150 hover:border-sky hover:text-ink"
                    aria-label={isZh ? '下两周' : 'Next 2 weeks'}
                  >
                    →
                  </Link>
                </div>
              </div>

              {/* 7-col grid, 2 rows. min-h-[100px] cells so chip names fit
                  comfortably. minmax(0,1fr) defeats min-content from nowrap
                  chips that would otherwise force overflow at 375px. */}
              <div
                className="grid border-t border-l border-hairline"
                style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
              >
                {(isZh
                  ? ['一','二','三','四','五','六','日']
                  : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                ).map((d) => (
                  <div
                    key={`m-${d}`}
                    className="border-r border-b border-hairline px-[0.3rem] py-[0.55rem] text-center"
                  >
                    <span className="font-sans text-[9px] font-semibold tracking-[0.14em] uppercase text-ink-soft">
                      {d}
                    </span>
                  </div>
                ))}

                {twoWeekGrid.flat().map((cell, i) => {
                  const dayStr = formatYMD(cell.date)
                  const chips = occByDay.get(dayStr) ?? []
                  const isSelected = dayStr === selectedDay
                  return (
                    <Suspense
                      key={`m-${i}`}
                      fallback={
                        <div className="border-r border-b border-hairline p-[6px_5px] min-h-[100px]" />
                      }
                    >
                      <CalendarDayLink
                        dateStr={dayStr}
                        isSelected={isSelected}
                        className={[
                          'border-r border-b border-hairline p-[6px_5px] min-h-[100px] cursor-pointer',
                          'transition-colors duration-150 relative',
                          isSelected ? 'bg-sky/[0.09]' : 'hover:bg-sky/[0.05]',
                        ].join(' ')}
                      >
                        <span className="font-serif text-[13px] font-normal text-ink block mb-[4px] leading-none">
                          {cell.day}
                          {cell.isToday && (
                            <span
                              className="inline-block w-[4px] h-[4px] bg-sky rounded-full ml-[3px] align-middle relative top-[-1px]"
                              aria-label="today"
                            />
                          )}
                        </span>
                        {chips.length > 0 && (
                          <div className="flex flex-col gap-[2px] mt-[2px] min-w-0">
                            {chips.slice(0, 2).map((chip, ci) => {
                              const { bg, text } = chipColorForCategory(chip.categorySlug)
                              return (
                                <span
                                  key={ci}
                                  className={`block font-sans text-[10px] font-semibold rounded-[6px] px-[4px] py-[1px] leading-[1.35] tracking-[0.01em] overflow-hidden text-ellipsis whitespace-nowrap min-w-0 ${bg} ${text}`}
                                >
                                  {chip.activityTitle}
                                </span>
                              )
                            })}
                            {chips.length > 2 && (
                              <span className="block font-sans text-[9px] text-ink-soft pl-[2px]">
                                +{chips.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </CalendarDayLink>
                    </Suspense>
                  )
                })}
              </div>
            </div>

            {/* ─── DESKTOP MONTH GRID (≥md) ──────────────────────────── */}
            <div className="hidden md:block">
            {/* Month header */}
            <div className="flex items-baseline justify-between mb-8">
              <div className="flex items-baseline gap-[0.65rem]">
                <span className="font-serif text-[20px] font-normal text-ink">
                  {isZh ? `${monthZh} ${calYear}` : `${monthEn} ${calYear}`}
                </span>
              </div>
              <div className="flex items-center gap-[1.1rem]">
                <Link
                  href={calNavHref(prevM.y, prevM.m)}
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-full border border-hairline text-[13px] text-sky leading-none no-underline transition-colors duration-150 hover:border-sky hover:text-ink"
                  aria-label="Previous month"
                >
                  ←
                </Link>
                <Link
                  href={calNavHref(nextM.y, nextM.m)}
                  className="flex items-center justify-center w-[28px] h-[28px] rounded-full border border-hairline text-[13px] text-sky leading-none no-underline transition-colors duration-150 hover:border-sky hover:text-ink"
                  aria-label="Next month"
                >
                  →
                </Link>
              </div>
            </div>

            {/* 7-column grid — minmax(0,1fr) defeats min-content from nowrap chips
                inside cells; without it a long chip name forces its column wider
                and the grid overflows the viewport at 375px. */}
            <div
              className="grid border-t border-l border-hairline"
              style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
            >
              {/* Weekday headers */}
              {(isZh
                ? ['一', '二', '三', '四', '五', '六', '日']
                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              ).map((d) => (
                <div
                  key={d}
                  className="border-r border-b border-hairline px-[0.5rem] py-[0.65rem] text-center"
                >
                  <span className="font-sans text-[9px] font-semibold tracking-[0.14em] uppercase text-ink-soft">
                    {d}
                  </span>
                </div>
              ))}

              {/* Day cells */}
              {calGrid.flat().map((cell, i) => {
                const dayStr = formatYMD(cell.date)
                const chips = occByDay.get(dayStr) ?? []
                const isSelected = dayStr === selectedDay

                // Build the new params for clicking this day
                const newParams = new URLSearchParams()
                newParams.set('view', 'calendar')
                if (activeCat) newParams.set('cat', activeCat)
                if (monthParam) newParams.set('month', monthParam)
                if (!isSelected) newParams.set('day', dayStr)

                return (
                  <Suspense key={i} fallback={
                    <div className="border-r border-b border-hairline p-[10px_12px] min-h-[80px]" />
                  }>
                    <CalendarDayLink
                      dateStr={dayStr}
                      isSelected={isSelected}
                      className={[
                        'border-r border-b border-hairline p-[10px_12px] min-h-[80px] cursor-pointer',
                        'transition-colors duration-150 relative',
                        cell.isCurrentMonth ? '' : 'opacity-[0.38]',
                        isSelected ? 'bg-sky/[0.09]' : 'hover:bg-sky/[0.05]',
                      ].join(' ')}
                    >
                      <span
                        className="font-serif text-[14px] font-normal text-ink block mb-[5px] leading-none"
                      >
                        {cell.day}
                        {cell.isToday && (
                          <span
                            className="inline-block w-[4px] h-[4px] bg-sky rounded-full ml-[3px] align-middle relative top-[-1px]"
                            aria-label="today"
                          />
                        )}
                      </span>
                      {chips.length > 0 && (
                        <div className="flex flex-col gap-[3px] mt-[3px] min-w-0">
                          {chips.slice(0, 3).map((chip, ci) => {
                            const { bg, text } = chipColorForCategory(chip.categorySlug)
                            return (
                              <span
                                key={ci}
                                className={`block font-sans text-[9px] font-semibold rounded-[8px] px-[5px] py-[1px] leading-[1.55] tracking-[0.02em] overflow-hidden text-ellipsis whitespace-nowrap min-w-0 ${bg} ${text}`}
                              >
                                {chip.activityTitle}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </CalendarDayLink>
                  </Suspense>
                )
              })}
            </div>
            </div>{/* /hidden md:block desktop month grid */}

            {/* Day detail panel — shared between mobile and desktop */}
            {selectedDay && selectedDayActivities.length > 0 && (
              <div id="day-detail" className="mt-10 pt-8 border-t border-hairline scroll-mt-20">
                <p className="font-serif text-[15px] font-normal text-ink mb-6">
                  {(() => {
                    const [y, m, d] = selectedDay.split('-').map(Number)
                    const dateObj = new Date(y, m - 1, d)
                    return isZh
                      ? `${m}月${d}日的活动`
                      : `Activities on ${dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                  })()}
                </p>
                <div
                  className="grid gap-[2px]"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
                >
                  {selectedDayActivities.map((act: any) => {
                    const imgUrl = mediaUrl(act.heroImage)
                    const imgAlt = mediaAlt(act.heroImage, act.title)
                    // Find the specific occurrence on this day
                    const chips = occByDay.get(selectedDay) ?? []
                    const chip = chips.find((c) => c.activitySlug === act.slug)

                    return (
                      <div key={act.id} className="block text-inherit">
                        {imgUrl ? (
                          <Image
                            src={imgUrl}
                            alt={imgAlt}
                            width={500}
                            height={300}
                            className="w-full aspect-[5/3] object-cover saturate-[0.85] block"
                          />
                        ) : (
                          <div className="w-full aspect-[5/3] bg-ink/15" />
                        )}
                        <div className="pt-3 pb-4 border-t border-hairline">
                          {chip?.startAt && (
                            <p className="font-sans text-[13px] font-semibold tracking-[0.14em] uppercase text-ink-soft mb-1">
                              {formatDateCompact(new Date(chip.startAt), locale)}
                            </p>
                          )}
                          <h3 className="font-serif text-[18px] font-medium text-ink mb-2">
                            {act.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            <Link
                              href={locationPath(locale, slug, `/activities/${act.slug}`)}
                              className="font-sans text-[11px] font-semibold tracking-[0.06em] text-sky no-underline transition-colors duration-150 hover:text-ink"
                            >
                              {t(locale, 'cta.view_details')}
                            </Link>
                            {chip?.occurrenceId &&
                              (isSessionPast(chip.startAt, today) ? (
                                <span className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-soft border border-ink-soft/30 rounded-full px-[1.1rem] py-[0.45rem] cursor-default">
                                  {isZh ? '已结束' : 'Ended'}
                                </span>
                              ) : (
                                <Link
                                  href={locationPath(locale, slug, `/book?activity=${act.slug}&occ=${chip.occurrenceId}&src=calendar`)}
                                  className="font-sans text-[11px] font-semibold tracking-[0.1em] uppercase text-ink bg-sky rounded-full px-[1.1rem] py-[0.45rem] no-underline transition-colors duration-150 hover:bg-blue-deep hover:text-paper"
                                >
                                  {t(locale, 'cta.book_now')}
                                </Link>
                              ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedDay && selectedDayActivities.length === 0 && (
              <div id="day-detail" className="mt-10 pt-8 border-t border-hairline scroll-mt-20">
                <p className="font-sans text-[13px] text-ink-soft">
                  {t(locale, 'meta.no_activities')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
