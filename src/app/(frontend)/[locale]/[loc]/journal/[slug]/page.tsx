// Detail pages keep live CMS reads (seat counts); only index and landing pages
// use ISR.
export const dynamic = 'force-dynamic'

import { hasUsableSlug } from '@/lib/activity-list'
import { pageTitle } from '@/lib/page-title'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

import {
  getLocationBySlug,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import { t } from '@/lib/i18n'
import { getLocale } from '@/lib/route-locale'
import { getRouteParams } from '@/lib/route-params'
import { getPayloadClient } from '@/lib/payload'
import { hasEnglishVersion } from '@/lib/content'
import { hasUsableLocalizedTitle, publicFallbackLocale } from '@/lib/public-locale'
import { academyName } from '@/lib/short-name'
import { toZonedTime, format as fmtTz } from 'date-fns-tz'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl } from '@/lib/site-config'
import { JsonLd } from '@/components/JsonLd'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { fillDescription, locationSeoKeywords } from '@/lib/seo'
import { mediaDimensions } from '@/lib/media-dimensions'
import { justifiedRows } from '@/lib/justified-rows'
import type { Journal, Media, Activity, Location } from '@/payload-types'
import { RichText } from '@/components/RichText'
import { BAC_NINH_SLUG, bacNinhDetailTitle } from '@/lib/bac-ninh-seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; loc: string; slug: string }>
}): Promise<Metadata> {
  const p = await getRouteParams(params)
  const locale = await getLocale(params)
  const location = await getLocationBySlug(p.loc, locale)
  if (!location) return {}

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'journal',
    where: {
      and: [
        { slug: { equals: p.slug } },
        { location: { equals: location.id } },
        { status: { equals: 'published' } },
      ],
    },
    locale: locale as any,
    fallbackLocale: publicFallbackLocale(locale) as any,
    depth: 1,
    overrideAccess: true,
    limit: 1,
  })
  const entry = result.docs[0] as Journal | undefined
  if (!entry || !hasUsableLocalizedTitle(entry.title, locale)) return {}
  const englishExists =
    locale === 'en' || (await hasEnglishVersion('journal', p.slug, location.id))

  const coverImgUrl =
    entry.coverImage && typeof entry.coverImage !== 'number'
      ? (entry.coverImage as Media).url ?? undefined
      : undefined

  const displayName = academyName(location.city, location.name)
  const inThailandNetwork = isThailandNetworkLocation(location)
  const title =
    location.slug === BAC_NINH_SLUG
      ? bacNinhDetailTitle(locale, 'journal', entry.title)
      : pageTitle(locale, entry.title, locale === 'zh-CN' ? '学堂笔记' : 'Journal', displayName)
  const description = fillDescription(
    locale === 'zh-CN'
      ? `${displayName}的现场记录「${entry.title}」，记录安心禅茶、读书会、正念禅修与日常修学中的真实相遇。`
      : `A journal entry from ${displayName}: “${entry.title}”. A first-hand account of meditation, Dhyana Tea, reading circles and everyday practice.`,
    locale,
    displayName,
  )

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc, `/journal/${p.slug}`),
    imageUrl: coverImgUrl,
    locale,
    siteName: locationSiteName(location, locale),
    keywords: locationSeoKeywords(locale, location.city, displayName, [
      entry.title,
      locale === 'zh-CN' ? '佛学笔记' : 'Buddhist journal',
      locale === 'zh-CN' ? '禅修记录' : 'Zen meditation journal',
    ], inThailandNetwork),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, `/journal/${p.slug}`),
      ...(englishExists ? { en: locationUrl('en', p.loc, `/journal/${p.slug}`) } : {}),
    },
  })
}

const TZ = 'Asia/Bangkok'

// Gallery rows aim for this width:height ratio (about three 3:4 phone photos)
// and never grow taller than the max height on wide screens.
const GALLERY_ROW_RATIO = 2.3
const GALLERY_ROW_MAX_HEIGHT = 640

function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return (img as Media).url ?? null
}
function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return (img as Media).alt ?? fallback
}

function formatFullDate(dateStr: string, isZh: boolean): string {
  const d = toZonedTime(new Date(dateStr), TZ)
  if (isZh) {
    return `${fmtTz(d, 'M月 d日', { timeZone: TZ })} · ${d.getFullYear()}`
  }
  return fmtTz(d, 'MMMM d, yyyy', { timeZone: TZ })
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; loc: string; slug: string }>
}) {
  const p = await getRouteParams(params)

  const locSlug = p.loc

  const locale = await getLocale(params)
  const isZh = locale === 'zh-CN'

  const location = await getLocationBySlug(locSlug, locale)
  if (!location) notFound()

  // ─ Fetch journal entry ───────────────────────────────────────────────
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'journal',
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

  const entry = result.docs[0] as Journal | undefined
  if (!entry) notFound()
  // Untranslated entry: send English visitors to the English journal list.
  if (!hasUsableLocalizedTitle(entry.title, locale)) {
    redirect(locationPath(locale, locSlug, '/journal'))
  }

  // Cross-location guard
  const entryLocSlug =
    typeof entry.location === 'object'
      ? (entry.location as Location).slug
      : null
  if (entryLocSlug && entryLocSlug !== locSlug) notFound()

  // ─ Related activity ─────────────────────────────────────────────────
  // Only link to an activity page that resolves: published, same place, and
  // titled in this language.
  const relatedCandidate =
    entry.relatedActivity && typeof entry.relatedActivity === 'object'
      ? (entry.relatedActivity as Activity)
      : null
  const relatedLocSlug =
    relatedCandidate && typeof relatedCandidate.location === 'object'
      ? (relatedCandidate.location as Location).slug
      : null
  const relatedActivity =
    relatedCandidate &&
    relatedCandidate.status === 'published' &&
    (!relatedLocSlug || relatedLocSlug === locSlug) &&
    hasUsableLocalizedTitle(relatedCandidate.title, locale)
      ? relatedCandidate
      : null

  // ─ Meta ─────────────────────────────────────────────────────────────
  const coverUrl = mediaUrl(entry.coverImage)
  const coverAlt = entry.coverAlt?.trim() || mediaAlt(entry.coverImage, entry.title)
  const coverDimensions = mediaDimensions(entry.coverImage, { width: 1200, height: 800 })
  const academyDisplayName = academyName(location.city, location.name)

  const galleryPhotos = (entry.photos ?? []).flatMap((photo, i) => {
    const url = mediaUrl(photo.image)
    if (!url) return []
    const { width, height } = mediaDimensions(photo.image, { width: 900, height: 600 })
    return [
      {
        key: photo.id ?? String(i),
        url,
        alt: photo.alt?.trim() || mediaAlt(photo.image, entry.title),
        caption: photo.caption,
        width,
        height,
        ratio: width / height,
      },
    ]
  })
  const galleryRows = justifiedRows(
    galleryPhotos.map((photo) => photo.ratio),
    GALLERY_ROW_RATIO,
  ).map((row) => row.map((i) => galleryPhotos[i]))

  const breadcrumb = breadcrumbJsonLd([
    ...(isThailandNetworkLocation(location)
      ? [{ name: isZh ? '总门户' : 'Network', url: locationUrl(locale, locSlug) }]
      : []),
    { name: academyDisplayName, url: locationUrl(locale, locSlug) },
    { name: t(locale, 'eyebrow.journal'), url: locationUrl(locale, locSlug, '/journal') },
    { name: entry.title, url: locationUrl(locale, locSlug, `/journal/${entry.slug}`) },
  ])
  const entryUrl = locationUrl(locale, locSlug, `/journal/${entry.slug}`)
  const academyUrl = locationUrl(locale, locSlug)
  const inThailandNetwork = isThailandNetworkLocation(location)
  const article = articleJsonLd({
    headline: entry.title,
    url: entryUrl,
    locale,
    datePublished: entry.date,
    dateModified: entry.updatedAt,
    description: isZh
      ? `${academyDisplayName}的学堂笔记：${entry.title}`
      : `A journal entry from ${academyDisplayName}: ${entry.title}`,
    imageUrl: coverUrl,
    authorName: academyDisplayName,
    authorUrl: academyUrl,
    ...(inThailandNetwork
      ? {}
      : {
          publisherName: locationSiteName(location, locale),
          publisherUrl: academyUrl,
          keywords: locationSeoKeywords(
            locale,
            location.city,
            academyDisplayName,
            [entry.title],
            false,
          ),
        }),
  })

  return (
    <div>
      <JsonLd data={[breadcrumb, article]} />
      {/* ─── HEADER + BODY | COVER ───────────────────────────────── */}
      {/* Desktop: title and body share the left column; the cover sits in the
          right column and stays in view while a long body scrolls past.
          Mobile: header, cover, body in one column. */}
      <div
        className="px-[6vw] grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-14"
        style={{ paddingTop: '8rem', paddingBottom: '4rem' }}
      >
        <header className="lg:col-span-7 lg:row-start-1">
          {/* Eyebrow */}
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
            {isZh
              ? `${location.name} · ${t(locale, 'eyebrow.journal')}`
              : `${academyDisplayName} · ${t(locale, 'eyebrow.journal')}`}
          </p>

          {/* Title */}
          <h1
            className="font-serif font-normal text-ink leading-[1.2] mb-4"
            style={{ fontSize: 'clamp(26px, 3.5vw, 44px)' }}
          >
            {entry.title}
          </h1>

          {/* Date */}
          {entry.date && (
            <p className="font-sans text-[12px] font-semibold tracking-[0.12em] text-ink-soft mb-4">
              {formatFullDate(entry.date, isZh)}
            </p>
          )}

          {/* Related activity link */}
          {relatedActivity && hasUsableSlug(relatedActivity) && (
            <p className="font-sans text-[13px] text-ink-soft">
              {t(locale, 'meta.related_activity')}{' '}
              <Link
                href={locationPath(locale, locSlug, `/activities/${relatedActivity.slug}`)}
                className="inline-flex min-h-11 items-center text-blue-deep no-underline hover:text-ink transition-colors font-semibold md:min-h-0"
              >
                {relatedActivity.title} →
              </Link>
            </p>
          )}
        </header>

        {/* Cover keeps its own ratio (no crop, no letterbox) and is capped to
            the viewport so a tall phone photo never outgrows the screen. */}
        {coverUrl && (
          <div className="mt-10 lg:mt-0 lg:col-start-8 lg:col-span-5 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24 lg:self-start">
            <Image
              src={coverUrl}
              alt={coverAlt}
              width={coverDimensions.width}
              height={coverDimensions.height}
              priority
              sizes="(min-width: 1024px) 40vw, 88vw"
              className="mx-auto lg:mr-0 block h-auto w-auto max-w-full max-h-[78vh] lg:max-h-[calc(100dvh-10rem)] saturate-[0.88]"
            />
          </div>
        )}

        {entry.body && (
          <div className="lg:col-span-7 lg:row-start-2 mt-10 pt-10 border-t border-hairline">
            <div className="max-w-prose font-sans text-[15px] text-ink leading-[1.85]">
              <RichText data={entry.body} />
            </div>
          </div>
        )}
      </div>

      {/* ─── PHOTO GALLERY ────────────────────────────────────────── */}
      {/* Justified rows: each photo gets a column proportional to its width
          ratio, so photos in a row share one height and none is cropped.
          Mobile stacks them one per line. */}
      {galleryRows.length > 0 && (
        <div className="px-[6vw] pb-20 border-t border-hairline pt-12">
          <div className="flex flex-col gap-10 md:gap-4">
            {galleryRows.map((row, r) => {
              const rowRatio = row.reduce((sum, item) => sum + item.ratio, 0)
              return (
                <div
                  key={r}
                  className="flex flex-col gap-10 md:grid md:gap-4 w-full"
                  style={{
                    gridTemplateColumns: row.map((item) => `${item.ratio}fr`).join(' '),
                    maxWidth: `${Math.round(rowRatio * GALLERY_ROW_MAX_HEIGHT)}px`,
                  }}
                >
                  {row.map((item) => (
                    <figure key={item.key} className="m-0 flex flex-col gap-2">
                      <Image
                        src={item.url}
                        alt={item.alt}
                        width={item.width}
                        height={item.height}
                        sizes={`(min-width: 768px) ${Math.ceil((item.ratio / rowRatio) * 88)}vw, 88vw`}
                        className="mx-auto block h-auto w-auto max-w-full max-h-[80vh] md:w-full md:max-h-none saturate-[0.88]"
                      />
                      {item.caption && (
                        <figcaption className="font-serif text-[14px] text-ink-soft leading-[1.5]">
                          {item.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── FOOTER LINK ──────────────────────────────────────────── */}
      <div className="px-[6vw] pb-24 pt-4 border-t border-hairline">
        <Link
          href={locationPath(locale, locSlug, '/journal')}
          className="inline-flex min-h-11 items-center font-sans text-[13px] font-semibold tracking-[0.06em] text-blue-deep no-underline transition-colors duration-150 hover:text-ink md:min-h-0"
        >
          {t(locale, 'cta.more_journal')}
        </Link>
      </div>
    </div>
  )
}
