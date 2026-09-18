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
import { getRecentJournalForLocation } from '@/lib/content'
import { academyName } from '@/lib/short-name'
import { toZonedTime, format as fmtTz } from 'date-fns-tz'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl } from '@/lib/site-config'
import { locationSeoKeywords } from '@/lib/seo'
import type { Media, Journal } from '@/payload-types'

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
    ? `现场 — ${displayName}`
    : `Journal — ${displayName}`
  const description = locale === 'zh-CN'
    ? `${displayName}的学堂笔记与现场记录：佛学、禅修、正念、禅茶、读书、共修与日常修学。`
    : `Journal entries from ${displayName}: Buddhism, Zen meditation, mindfulness, tea practice, reading, and daily contemplative life.`

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc, '/journal'),
    locale,
    siteName: locationSiteName(location, locale),
    keywords: locationSeoKeywords(locale, location.city, displayName, [
      locale === 'zh-CN' ? '学堂笔记' : 'Buddhist journal',
      locale === 'zh-CN' ? '禅修记录' : 'Zen meditation journal',
    ], inThailandNetwork),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, '/journal'),
      en: locationUrl('en', p.loc, '/journal'),
    },
  })
}

const TZ = 'Asia/Bangkok'

function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return (img as Media).url ?? null
}
function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return (img as Media).alt ?? fallback
}

function formatEntryDate(dateStr: string, isZh: boolean): string {
  const d = toZonedTime(new Date(dateStr), TZ)
  if (isZh) {
    return fmtTz(d, 'M月 d日', { timeZone: TZ })
  }
  return fmtTz(d, 'MMM d', { timeZone: TZ }).toUpperCase()
}

// Alternate aspect ratios across the grid to break monotony
const ASPECT_CLASSES = ['aspect-[3/4]', 'aspect-[4/5]', 'aspect-[16/10]']

export default async function JournalPage({
  params,
}: {
  params: Promise<{ loc: string }>
}) {
  const p = await params

  const slug = p.loc

  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  const location = await getLocationBySlug(slug, locale)
  if (!location) notFound()

  // Fetch up to 24 journal entries
  const entries = await getRecentJournalForLocation(location.id, locale, 24)

  const academyDisplayName = academyName(location.city, location.name)

  return (
    <div>
      {/* ─── PAGE HEADER BAND ───────────────────────────────────────── */}
      <div
        className="px-[6vw] border-b border-hairline"
        style={{ paddingTop: '8rem', paddingBottom: '4.5rem' }}
      >
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
          {isZh
            ? `${location.name} · ${t(locale, 'eyebrow.journal')}`
            : `${academyDisplayName} · ${t(locale, 'eyebrow.journal')}`}
        </p>
        <h1
          className="font-serif font-normal text-ink leading-[1.2] mb-3"
          style={{ fontSize: 'clamp(28px, 4vw, 50px)' }}
        >
          {isZh ? '时光的纸条' : 'Notes from the days'}
        </h1>
        <p className="font-serif text-[19px] text-ink-soft">
          {isZh
            ? '每一次聚集,都是值得记录的时刻。'
            : 'Every gathering is worth remembering.'}
        </p>
      </div>

      {/* ─── JOURNAL GRID ───────────────────────────────────────────── */}
      <div className="px-[6vw] pt-16 pb-36">
        {entries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[2px]">
            {(entries as (Journal & { coverImage: Media | number })[]).map((entry, idx) => {
              const imgUrl = mediaUrl(entry.coverImage)
              const imgAlt = entry.coverAlt?.trim() || mediaAlt(entry.coverImage, entry.title)
              const aspectClass = ASPECT_CLASSES[idx % ASPECT_CLASSES.length]

              // Determine image dimensions based on aspect ratio
              const dims =
                aspectClass === 'aspect-[3/4]'
                  ? { w: 600, h: 800 }
                  : aspectClass === 'aspect-[4/5]'
                  ? { w: 600, h: 750 }
                  : { w: 800, h: 500 }

              const dateLabel = entry.date ? formatEntryDate(entry.date, isZh) : null

              return (
                <Link
                  key={entry.id}
                  href={locationPath(locale, slug, `/journal/${entry.slug}`)}
                  className="block no-underline text-inherit group"
                >
                  <div className="overflow-hidden">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={imgAlt}
                        width={dims.w}
                        height={dims.h}
                        className={[
                          'w-full object-cover saturate-[0.82] block',
                          aspectClass,
                          'transition-transform duration-500 group-hover:scale-[1.02]',
                        ].join(' ')}
                      />
                    ) : (
                      <div
                        className={`w-full bg-ink/15 ${aspectClass}`}
                      />
                    )}
                  </div>
                  <div className="pt-4 pb-6 border-t border-hairline">
                    {dateLabel && (
                      <p className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-soft mb-1">
                        {dateLabel}
                      </p>
                    )}
                    <h2 className="font-serif text-[17px] font-normal text-ink mb-2 leading-[1.35]">
                      {entry.title}
                    </h2>
                    <span className="font-sans text-[12px] font-semibold text-sky tracking-[0.04em] transition-colors duration-150 group-hover:text-ink">
                      {t(locale, 'cta.read_more')}
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
                {isZh ? '记录正在路上。' : 'Coming soon.'}
              </p>
              <p className="font-sans text-[13px] text-ink-soft">
                {isZh
                  ? '现场记录将在近期发布，敬请期待。'
                  : 'Journal entries will be published soon.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
