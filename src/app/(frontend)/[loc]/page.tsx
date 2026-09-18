import type { Metadata } from 'next'
import { pageTitle, splitPlaceName } from '@/lib/page-title'
import { activityExcerpt } from '@/lib/activity-text'
import { notFound } from 'next/navigation'
import ActivityImage from '@/components/activities/ActivityImage'
import { activityImageUrl } from '@/lib/activity-image'
import Image from 'next/image'
import Link from 'next/link'
import { getLocale, t } from '@/lib/i18n'
import {
  getLocationBySlug,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import {
  getFeaturedActivitiesForLocation,
  getRecentJournalForLocation,
} from '@/lib/content'
import { shortName, academyName } from '@/lib/short-name'
import { RichText } from '@/components/RichText'
import { formatDateCompact } from '@/lib/time'
import { buildMetadata } from '@/lib/metadata'
import {
  locationPath,
  locationUrl,
  SITE_BASE,
  SITE_LOCATION_SLUG,
} from '@/lib/site-config'
import { JsonLd } from '@/components/JsonLd'
import { localBusinessJsonLd } from '@/lib/jsonld'
import { locationSeoDescription, locationSeoKeywords } from '@/lib/seo'
import { bacNinhSignature, getBacNinhBrandCopy } from '@/lib/bac-ninh-copy'
import type { Media, Activity, Journal } from '@/payload-types'
import TrackedLink from '@/components/analytics/TrackedLink'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ loc: string }>
}): Promise<Metadata> {
  const p = await params
  const locale = await getLocale()
  const location = await getLocationBySlug(p.loc, locale)
  if (!location) return {}

  const heroImgUrl =
    location.heroImage && typeof location.heroImage !== 'number'
      ? (location.heroImage as Media).url ?? undefined
      : undefined

  const displayName = academyName(location.city, location.name)
  const inThailandNetwork = isThailandNetworkLocation(location)
  const siteName = locationSiteName(location, locale)
  const title = pageTitle(locale, displayName, inThailandNetwork ? siteName : null)
  const description = locationSeoDescription({
    locale,
    displayName,
    city: location.city,
    tagline: location.tagline,
  })

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc),
    imageUrl: heroImgUrl,
    locale,
    siteName,
    keywords: locationSeoKeywords(
      locale,
      location.city,
      displayName,
      [],
      inThailandNetwork,
    ),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc),
      en: locationUrl('en', p.loc),
      ...(p.loc === 'bac-ninh' && SITE_LOCATION_SLUG === 'bac-ninh'
        ? { vi: `${SITE_BASE}/vi` }
        : {}),
    },
  })
}

function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return (img as Media).url ?? null
}

function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return (img as Media).alt ?? fallback
}

/** Find the first upcoming occurrence's startAt for an activity */
function nextOccurrence(activity: Activity): string | null {
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

export default async function AcademyHomePage({
  params,
}: {
  params: Promise<{ loc: string }>
}) {
  const p = await params
  const locale = await getLocale()
  const isZh = locale === 'zh-CN'
  const slug = p.loc

  const location = await getLocationBySlug(slug, locale)
  if (!location) notFound()

  const [activities, journalEntries] = await Promise.all([
    getFeaturedActivitiesForLocation(location.id, locale, 3),
    getRecentJournalForLocation(location.id, locale, 3),
  ])

  const heroImgUrl = mediaUrl(location.heroImage as any)
  const heroImgAlt = mediaAlt(location.heroImage as any, location.name)
  const academyShortName = shortName(location.city, location.name)
  const academyDisplayName = academyName(location.city, location.name)
  const isBacNinh = location.slug === 'bac-ninh'
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${location.name} ${location.address || location.city}`,
  )}`
  const bacNinhCopy = getBacNinhBrandCopy(locale)
  // "Thien Minh Courtyard · Bac Ninh, Vietnam" → H1 "Thien Minh Courtyard",
  // locality in the eyebrow, so the English hero doesn't wrap to four lines.
  const heroName = splitPlaceName(academyDisplayName)
  const heroEyebrow = heroName.secondary || location.city

  const businessJsonLd = localBusinessJsonLd({
    displayName: academyDisplayName,
    city: location.city,
    url: locationUrl(locale, slug),
    locale,
    address: (location as any).address,
    mapEmbedUrl: (location as any).mapEmbedUrl,
    email: location.email,
    phone: location.phone,
    imageUrl: heroImgUrl,
    description: location.tagline,
    isThailandNetwork: isThailandNetworkLocation(location),
    sameAs: ((location as any).social ?? [])
      .map((s: { url?: string | null }) => s.url)
      .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0),
  })

  return (
    <div>
      <JsonLd data={businessJsonLd} />
      {/* ─── HERO ─────────────────────────────────── */}
      <section className="relative h-svh max-h-[760px] min-h-[520px] overflow-hidden">
        {heroImgUrl ? (
          <Image
            src={heroImgUrl}
            alt={heroImgAlt}
            fill
            priority
            className="object-cover object-[center_32%] saturate-[0.85] brightness-[0.9]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-pale to-sky" />
        )}
        {/* gradient overlay — dark anchor at bottom-left where the text lives.
            Deeper than before to provide a soft "floor" of contrast under the
            tagline even when the hero image is bright in that corner. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(45deg, rgba(42,42,51,0.86) 0%, rgba(42,42,51,0.55) 45%, rgba(42,42,51,0.15) 75%, transparent 100%)',
          }}
        />
        {/* text content */}
        <div
          className="absolute left-[8%] bottom-[12%] max-w-[580px]"
          style={{ textShadow: 'var(--shadow-hero)' }}
        >
          <p className={`font-sans text-[11px] font-semibold ${isZh ? 'tracking-[0.32em]' : 'tracking-[0.22em] uppercase'} text-paper/75 mb-5`}>
            {heroEyebrow}
          </p>
          <h1
            className="font-serif text-paper leading-[1.1] tracking-[0.04em] mb-3"
            style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}
          >
            {heroName.primary}
          </h1>
          {location.tagline && (
            <p
              className="font-serif text-paper/95 leading-[1.2] mb-11"
              style={{
                fontSize: 'clamp(20px, 3vw, 40px)',
                // Heavier than --shadow-hero (which is tuned for the h1):
                // a soft, large drop shadow PLUS a tighter dark glow so the
                // tagline holds its silhouette against bright sky / foliage.
                textShadow:
                  '0 2px 18px rgba(0,0,0,0.6), 0 0 6px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.45)',
                // Sub-pixel warm-grey outline keeps glyph edges crisp on any
                // background — feels like an etched serif, not a label.
                WebkitTextStroke: '0.3px rgba(20,18,16,0.55)',
              }}
            >
              {location.tagline}
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <Link
              href={locationPath(locale, slug, '/book')}
              className="inline-flex min-h-11 items-center font-sans text-[12px] font-semibold tracking-[0.1em] uppercase text-paper bg-blue-deep rounded-full px-7 py-3 no-underline transition-colors duration-150 hover:bg-ink"
            >
              {t(locale, 'book.cta')}
            </Link>
            <Link
              href={locationPath(locale, slug, '/about')}
              className="inline-flex min-h-11 items-center font-sans text-[12px] font-semibold tracking-[0.1em] uppercase text-paper bg-transparent border-[1.5px] border-paper/60 rounded-full px-7 py-3 no-underline transition-colors duration-150 hover:border-paper"
            >
              {t(locale, 'book.secondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── SECTION 1: FEATURED ACTIVITIES ──────── */}
      <section className="px-[6vw] py-36">
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-6">
          {t(locale, 'eyebrow.upcoming')}
        </p>
        <h2
          className="font-serif font-normal text-ink leading-[1.3] mb-14"
          style={{ fontSize: 'clamp(24px, 3.2vw, 40px)' }}
        >
          {t(locale, 'section.few_ways_in')}
        </h2>

        {activities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px] mb-14">
            {activities.map((activityDoc) => {
              const activity = activityDoc as Activity & { heroImage: Media | number }
              const imgUrl = activityImageUrl(activity.heroImage)
              const imgAlt = mediaAlt(activity.heroImage, activity.title)
              const upcoming = nextOccurrence(activity)
              const excerpt = activityExcerpt(activity.shortDesc, activity.title)

              return (
                <Link
                  key={activity.id}
                  href={locationPath(locale, slug, `/activities/${activity.slug}`)}
                  className="flex h-full min-w-0 flex-col no-underline text-inherit group"
                >
                  {imgUrl ? (
                    <ActivityImage
                      src={imgUrl}
                      alt={imgAlt}
                      width={900}
                      height={600}
                      sizes="(min-width: 768px) 33vw, 100vw"
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
                      {activity.title}
                    </h3>
                    {excerpt && (
                      <p className="font-sans text-[13px] text-ink-soft mb-4 leading-[1.6] line-clamp-2">
                        {excerpt}
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
        ) : (
          // One short line with a useful next step instead of a tall empty box.
          <p className="font-sans text-[14px] text-ink-soft mb-6">
            {isZh ? '近期暂无活动安排，' : 'No sessions are scheduled right now. '}
            <Link
              href={locationPath(locale, slug, '/book#inquiry')}
              className="inline-flex min-h-11 items-center font-semibold text-blue-deep no-underline transition-colors duration-150 hover:text-ink md:min-h-0"
            >
              {isZh ? '留言告诉我们你想参加什么 →' : 'Tell us what you would like to join →'}
            </Link>
          </p>
        )}

        <div className={activities.length > 0 ? 'text-center' : ''}>
          <Link
            href={locationPath(locale, slug, '/activities')}
            className="inline-flex min-h-11 items-center font-sans text-[13px] font-semibold tracking-[0.06em] text-blue-deep no-underline transition-colors duration-150 hover:text-ink md:min-h-0"
          >
            {t(locale, 'cta.view_all_activities')}
          </Link>
        </div>
      </section>

      {/* ─── SECTION 2: STORY / CONTEMPLATIVE ────── */}
      <section id="about" className="px-[6vw] py-36 border-t border-hairline border-b border-hairline">
        <div className="max-w-prose">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-8">
            {t(locale, 'section.academy_story')}
          </p>

          {location.story ? (
            <RichText
              data={location.story}
              className="font-serif text-[clamp(17px,2vw,21px)] text-ink leading-[1.85] mb-6"
            />
          ) : isBacNinh ? (
            <div className="font-serif text-[clamp(17px,2vw,21px)] text-ink leading-[1.85] mb-6 space-y-5">
              {bacNinhCopy.story.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="font-serif text-[clamp(17px,2vw,21px)] text-ink leading-[1.85] mb-6">
              {isZh
                ? `${location.name}坐落于${location.city}，是一处与日常修学相伴的安静空间。我们不教授什么，只是一起静坐、喝茶、读书、走路。来访的人会发现，这里没有规则，只有一种不疾不徐的节奏。`
                : `${location.name} is a quiet space for daily practice in ${location.city}. We don't teach anything; we simply sit together, drink tea, read, and walk. Visitors find that there are no rules here, only a gentle, unhurried rhythm.`}
            </p>
          )}

          {/* Closing line under the story. Bac Ninh uses its own copy in the
              page language (never the zh CMS fallback on /en) and repeated
              sentences collapse. Other academies keep the network stem. */}
          <p className="font-serif text-[18px] text-ink-soft leading-[1.7]">
            {isBacNinh
              ? bacNinhSignature(locale, (location as any).signatureLine)
              : isZh
                ? `${location.name}，${location.city}的修学空间。${(location as any).signatureLine || '静坐、喝茶、读书、行走。'}`
                : (location as any).signatureLine ||
                  `A quiet space for practice in ${location.city}. We sit, drink tea, read, and walk together.`}
          </p>
        </div>
      </section>

      {/* ─── SECTION 3: JOURNAL PREVIEW ──────────── */}
      {/* Hidden entirely until there is something to read. */}
      {journalEntries.length > 0 && (
        <section className="px-[6vw] py-36">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-8">
            {t(locale, 'eyebrow.journal')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px] mb-12">
            {journalEntries.map((entryDoc, idx) => {
              const entry = entryDoc as Journal & { coverImage: Media | number }
              const imgUrl = mediaUrl(entry.coverImage)
              const imgAlt = entry.coverAlt?.trim() || mediaAlt(entry.coverImage, entry.title)
              const dateStr = entry.date
                ? new Date(entry.date).toLocaleDateString(
                    locale === 'zh-CN' ? 'zh-CN' : 'en-US',
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )
                : ''

              // vary aspect ratio per mockup
              const aspectClass =
                idx === 0 ? 'aspect-[3/4]' : idx === 1 ? 'aspect-square' : 'aspect-[4/3]'

              return (
                <Link
                  key={entry.id}
                  href={locationPath(locale, slug, `/journal/${entry.slug}`)}
                  className="block no-underline text-inherit group"
                >
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={imgAlt}
                      width={600}
                      height={idx === 0 ? 800 : idx === 1 ? 600 : 450}
                      className={`w-full ${aspectClass} object-cover saturate-[0.82] block`}
                    />
                  ) : (
                    <div className={`w-full ${aspectClass} bg-ink/15`} />
                  )}
                  <div className="pt-4 pb-5 pr-6 border-t border-hairline">
                    {dateStr && (
                      <p className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-soft mb-1">
                        {dateStr}
                      </p>
                    )}
                    <p className="font-serif text-[14px] text-ink mb-2">{entry.title}</p>
                    <span className="font-sans text-[12px] font-semibold text-blue-deep tracking-[0.04em] transition-colors duration-150 group-hover:text-ink">
                      {t(locale, 'cta.read_more')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="text-center">
            <Link
              href={locationPath(locale, slug, '/journal')}
              className="inline-flex min-h-11 items-center font-sans text-[13px] font-semibold tracking-[0.06em] text-blue-deep no-underline transition-colors duration-150 hover:text-ink md:min-h-0"
            >
              {t(locale, 'cta.all_entries')}
            </Link>
          </div>
        </section>
      )}

      {/* ─── SECTION 4: FIND US / MAP ────────────── */}
      {(location.address || location.mapEmbedUrl) && (
        <section id="find-us" className="px-[6vw] py-36 border-t border-hairline">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-10">
            {t(locale, 'eyebrow.find_us')}
          </p>

          {location.address && (
            <p className="font-sans text-[15px] text-ink mb-10 whitespace-pre-line leading-[1.75]">
              {location.address}
            </p>
          )}

          {location.mapEmbedUrl ? (
            <div className="overflow-hidden border border-hairline">
              <iframe
                src={location.mapEmbedUrl}
                width="100%"
                height="420"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="block border-0"
                title={isZh ? `${location.name}地图` : `${location.name} map`}
              />
            </div>
          ) : (
            <p className="font-sans text-[13px] text-ink-soft">
              {t(locale, 'meta.map_soon')}
            </p>
          )}
          <TrackedLink
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            analyticsEvent="map_open"
            analyticsParameters={{ location_slug: slug }}
            className="mt-6 inline-flex min-h-11 items-center font-sans text-[13px] font-semibold tracking-[0.04em] text-blue-deep no-underline transition-colors hover:text-ink md:min-h-0"
          >
            {isZh ? '在 Google 地图中打开 ↗' : 'Open in Google Maps ↗'}
          </TrackedLink>
        </section>
      )}
    </div>
  )
}
