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
import { academyName } from '@/lib/short-name'
import { toZonedTime, format as fmtTz } from 'date-fns-tz'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl } from '@/lib/site-config'
import { JsonLd } from '@/components/JsonLd'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/jsonld'
import { locationSeoKeywords } from '@/lib/seo'
import type { Journal, Media, Activity, Location } from '@/payload-types'
import { RichText } from '@/components/RichText'

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
    collection: 'journal',
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
  const entry = result.docs[0] as Journal | undefined
  if (!entry) return {}

  const coverImgUrl =
    entry.coverImage && typeof entry.coverImage !== 'number'
      ? (entry.coverImage as Media).url ?? undefined
      : undefined

  const displayName = academyName(location.city, location.name)
  const inThailandNetwork = isThailandNetworkLocation(location)
  const title = locale === 'zh-CN'
    ? `${entry.title} — ${displayName} 现场`
    : `${entry.title} — ${displayName} Journal`
  const description = locale === 'zh-CN'
    ? `${displayName}的现场记录：${entry.title}`
    : `A journal entry from ${displayName}: ${entry.title}`

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
      en: locationUrl('en', p.loc, `/journal/${p.slug}`),
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
  params: Promise<{ loc: string; slug: string }>
}) {
  const p = await params

  const locSlug = p.loc

  const locale = await getLocale()
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
    fallbackLocale: 'zh-CN' as any,
    depth: 2,
    overrideAccess: true,
    limit: 1,
  })

  const entry = result.docs[0] as Journal | undefined
  if (!entry) notFound()

  // Cross-location guard
  const entryLocSlug =
    typeof entry.location === 'object'
      ? (entry.location as Location).slug
      : null
  if (entryLocSlug && entryLocSlug !== locSlug) notFound()

  // ─ Related activity ─────────────────────────────────────────────────
  const relatedActivity =
    entry.relatedActivity && typeof entry.relatedActivity === 'object'
      ? (entry.relatedActivity as Activity)
      : null

  // ─ Meta ─────────────────────────────────────────────────────────────
  const coverUrl = mediaUrl(entry.coverImage)
  const coverAlt = entry.coverAlt?.trim() || mediaAlt(entry.coverImage, entry.title)
  const academyDisplayName = academyName(location.city, location.name)

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
      {/* ─── PAGE HEADER (no full-bleed hero — journal pages are quieter) ─── */}
      <div
        className="px-[6vw] border-b border-hairline"
        style={{ paddingTop: '8rem', paddingBottom: '4rem' }}
      >
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
        {relatedActivity && (
          <p className="font-sans text-[13px] text-ink-soft">
            {t(locale, 'meta.related_activity')}{' '}
            <Link
              href={locationPath(locale, locSlug, `/activities/${relatedActivity.slug}`)}
              className="text-sky no-underline hover:text-ink transition-colors font-semibold"
            >
              {relatedActivity.title} →
            </Link>
          </p>
        )}
      </div>

      {/* ─── COVER PHOTO ──────────────────────────────────────────── */}
      {coverUrl && (
        <div className="px-[6vw] pt-12">
          <div className="relative w-full" style={{ maxWidth: '1200px' }}>
            <Image
              src={coverUrl}
              alt={coverAlt}
              width={1200}
              height={675}
              priority
              className="w-full object-cover saturate-[0.88] block"
              style={{ aspectRatio: '16/9' }}
            />
          </div>
        </div>
      )}

      {/* ─── BODY TEXT ────────────────────────────────────────────── */}
      {entry.body && (
        <div className="px-[6vw] py-14">
          <div
            className="max-w-prose font-sans text-[15px] text-ink leading-[1.85]"
          >
            <RichText data={entry.body} />
          </div>
        </div>
      )}

      {/* ─── PHOTO GALLERY ────────────────────────────────────────── */}
      {entry.photos && entry.photos.length > 0 && (
        <div className="px-[6vw] pb-20 border-t border-hairline pt-10">
          <div className="flex flex-col gap-10" style={{ maxWidth: '900px' }}>
            {entry.photos.map((photo, i) => {
              const pUrl = mediaUrl(photo.image)
              const pAlt = photo.alt?.trim() || mediaAlt(photo.image, entry.title)

              // Pair photos: even index = full-width; odd index = paired with previous
              // For simplicity render each full-width or in pairs of 2
              return (
                <div key={photo.id ?? i} className="flex flex-col gap-2">
                  {pUrl ? (
                    <Image
                      src={pUrl}
                      alt={pAlt}
                      width={900}
                      height={600}
                      className="w-full object-cover saturate-[0.88] block"
                    />
                  ) : (
                    <div className="w-full aspect-[3/2] bg-ink/15" />
                  )}
                  {photo.caption && (
                    <p className="font-serif text-[14px] text-ink-soft leading-[1.5]">
                      {photo.caption}
                    </p>
                  )}
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
          className="font-sans text-[13px] font-semibold tracking-[0.06em] text-sky no-underline transition-colors duration-150 hover:text-ink"
        >
          {t(locale, 'cta.more_journal')}
        </Link>
      </div>
    </div>
  )
}
