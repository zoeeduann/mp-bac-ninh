import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getLocale, t } from '@/lib/i18n'
import {
  getLocationBySlug,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import { RichText } from '@/components/RichText'
import { buildMetadata } from '@/lib/metadata'
import { locationUrl } from '@/lib/site-config'
import { locationSeoDescription, locationSeoKeywords } from '@/lib/seo'
import { academyName } from '@/lib/short-name'
import type { Media, Location } from '@/payload-types'

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
  const pageTitle = locale === 'zh-CN'
    ? `关于 ${displayName}`
    : `About ${displayName}`
  const title = inThailandNetwork ? `${pageTitle} — ${siteName}` : pageTitle
  const description = locationSeoDescription({
    locale,
    displayName,
    city: location.city,
    tagline: location.tagline,
  })

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc, '/about'),
    imageUrl: heroImgUrl,
    locale,
    siteName,
    keywords: locationSeoKeywords(locale, location.city, displayName, [
      locale === 'zh-CN' ? '关于静心学堂' : 'about Mindfulpeace Academy',
      locale === 'zh-CN' ? '佛学修学空间' : 'Buddhist practice space',
    ], inThailandNetwork),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, '/about'),
      en: locationUrl('en', p.loc, '/about'),
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

export default async function AboutPage({
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

  const heroImgUrl = mediaUrl(location.heroImage as any)
  const heroImgAlt = mediaAlt(location.heroImage as any, location.name)

  return (
    <div>
      {/* ─── HERO IMAGE ───────────────────────────── */}
      {heroImgUrl && (
        <div className="relative h-[55vh] min-h-[380px] overflow-hidden">
          <Image
            src={heroImgUrl}
            alt={heroImgAlt}
            fill
            priority
            className="object-cover object-[center_32%] saturate-[0.85] brightness-[0.9]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(42,42,51,0.45) 0%, transparent 60%)',
            }}
          />
          <div className="absolute left-[6vw] bottom-10">
            <p className={`font-sans text-[11px] font-semibold ${isZh ? 'tracking-[0.32em]' : 'tracking-[0.22em] uppercase'} text-paper/70 mb-3`}>
              {location.city}
            </p>
            <h1
              className="font-serif text-paper leading-[1.1]"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              {location.name}
            </h1>
          </div>
        </div>
      )}

      {/* ─── STORY SECTION ────────────────────────── */}
      <section className="px-[6vw] py-36">
        {!heroImgUrl && (
          <div className="mb-16">
            <p className={`font-sans text-[11px] font-semibold ${isZh ? 'tracking-[0.32em]' : 'tracking-[0.22em] uppercase'} text-ink-soft mb-4`}>
              {location.city}
            </p>
            <h1
              className="font-serif font-normal text-ink leading-[1.1]"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              {location.name}
            </h1>
          </div>
        )}

        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-10">
          {t(locale, 'eyebrow.about')}
        </p>

        {location.story ? (
          <RichText
            data={location.story}
            className="font-serif text-[clamp(17px,2vw,21px)] text-ink leading-[1.85] max-w-prose mb-16"
          />
        ) : (
          <p className="font-serif text-[clamp(17px,2vw,21px)] text-ink leading-[1.85] max-w-prose mb-16">
            {isZh
              ? `${location.name}坐落于${location.city}，是一处与日常修学相伴的安静空间。我们不教授什么，只是一起静坐、喝茶、读书、走路。来访的人会发现，这里没有规则，只有一种不疾不徐的节奏。`
              : `${location.name} is a quiet space for daily practice in ${location.city}. We don't teach anything — we simply sit together, drink tea, read, and walk. There are no rules here, only a gentle, unhurried rhythm.`}
          </p>
        )}
      </section>

      {/* ─── TEAM SECTION ─────────────────────────── */}
      {location.team && location.team.length > 0 && (
        <section className="px-[6vw] py-24 border-t border-hairline">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-14">
            {t(locale, 'eyebrow.team')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {location.team.map((member) => {
              const photoUrl = mediaUrl(member.photo as any)
              const photoAlt = mediaAlt(member.photo as any, member.name)
              return (
                <div key={member.id ?? member.name}>
                  {photoUrl ? (
                    <Image
                      src={photoUrl}
                      alt={photoAlt}
                      width={400}
                      height={400}
                      className="w-full aspect-square object-cover saturate-[0.85] mb-5"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-ink/10 mb-5" />
                  )}
                  <h3 className="font-serif text-[18px] font-normal text-ink mb-2">
                    {member.name}
                  </h3>
                  {member.bio && (
                    <p className="font-sans text-[13px] text-ink-soft leading-[1.65]">{member.bio}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── FIND US ──────────────────────────────── */}
      {(location.address || location.mapEmbedUrl || location.transport) && (
        <section className="px-[6vw] py-24 border-t border-hairline">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-10">
            {t(locale, 'eyebrow.find_us')}
          </p>

          {location.address && (
            <p className="font-sans text-[15px] text-ink mb-10 whitespace-pre-line">
              {location.address}
            </p>
          )}

          {location.mapEmbedUrl ? (
            <div className="mb-10 overflow-hidden border border-hairline">
              <iframe
                src={location.mapEmbedUrl}
                width="100%"
                height="400"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="block border-0"
                title={isZh ? `${location.name}地图` : `${location.name} map`}
              />
            </div>
          ) : (
            <p className="font-sans text-[13px] text-ink-soft mb-10">
              {t(locale, 'meta.map_soon')}
            </p>
          )}

          {location.transport && (
            <div>
              <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-4">
                {t(locale, 'eyebrow.getting_here')}
              </p>
              <RichText
                data={location.transport}
                className="font-sans text-[15px] text-ink leading-[1.75] max-w-prose"
              />
            </div>
          )}
        </section>
      )}

      {/* ─── INTERNATIONAL LINK ───────────────────── */}
      <section className="px-[6vw] py-24 border-t border-hairline">
        <a
          href="https://mindfulpeace.org"
          target="_blank"
          rel="noreferrer"
          className="font-sans text-[12px] font-semibold tracking-[0.08em] text-sky no-underline transition-colors duration-150 hover:text-ink"
        >
          {t(locale, 'cta.about_international')}
        </a>
      </section>
    </div>
  )
}
