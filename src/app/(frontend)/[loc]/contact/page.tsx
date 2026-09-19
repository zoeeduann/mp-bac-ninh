import type { Metadata } from 'next'
import { pageTitle, splitPlaceName } from '@/lib/page-title'
import { contactChannels } from '@/lib/contact'
import ContactList from '@/components/layout/ContactList'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getLocale, t } from '@/lib/i18n'
import {
  getLocationBySlug,
  isThailandNetworkLocation,
  locationSiteName,
} from '@/lib/current-location'
import { RichText } from '@/components/RichText'
import { buildMetadata } from '@/lib/metadata'
import { locationPath, locationUrl } from '@/lib/site-config'
import { JsonLd } from '@/components/JsonLd'
import { faqPageJsonLd } from '@/lib/jsonld'
import { locationSeoKeywords } from '@/lib/seo'
import { academyName } from '@/lib/short-name'
import type { Media } from '@/payload-types'
import TrackedLink from '@/components/analytics/TrackedLink'
import { bacNinhSeo } from '@/lib/bac-ninh-seo'
import { placePageBreadcrumbJsonLd } from '@/lib/jsonld'

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
  const siteName = locationSiteName(location, locale)
  const bn = bacNinhSeo(location.slug, locale)
  const title = bn?.contactTitle ?? pageTitle(
    locale,
    locale === 'zh-CN' ? '联系' : 'Contact',
    displayName,
    inThailandNetwork ? siteName : null,
  )
  const description = bn?.contactDescription ?? locale === 'zh-CN'
    ? `联系${displayName}，了解${location.city}佛学、禅修、正念与静坐活动的微信、邮箱、地址和到访方式。`
    : `Contact ${displayName} in ${location.city} for Buddhism, Zen meditation, mindfulness, and sitting practice by email, WeChat, or in person.`

  return buildMetadata({
    title,
    description,
    url: locationUrl(locale, p.loc, '/contact'),
    locale,
    siteName,
    keywords: locationSeoKeywords(locale, location.city, displayName, [
      locale === 'zh-CN' ? `${location.city}静心联系方式` : `${location.city} meditation contact`,
      locale === 'zh-CN' ? '禅修预约' : 'Zen meditation booking',
    ], inThailandNetwork),
    alternateLanguages: {
      'zh-CN': locationUrl('zh-CN', p.loc, '/contact'),
      en: locationUrl('en', p.loc, '/contact'),
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

export default async function ContactPage({
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

  const wechatQrUrl = mediaUrl(location.wechatQr as any)
  const wechatQrAlt = mediaAlt(location.wechatQr as any, 'WeChat QR')
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${location.name} ${location.address || location.city}`,
  )}`

  const faqJsonLd = faqPageJsonLd(location.faq)
  const place = splitPlaceName(location.name)
  const channels = contactChannels(location, locale)

  return (
    <div>
      <JsonLd
        data={placePageBreadcrumbJsonLd({
          locale,
          locSlug: slug,
          placeName: splitPlaceName(academyName(location.city, location.name)).primary,
          pageName: t(locale, 'nav.contact'),
          pagePath: '/contact',
        })}
      />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      {/* ─── HEADER ───────────────────────────────── */}
      <section className="px-[6vw] py-28">
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
          {t(locale, 'eyebrow.contact')}
        </p>
        <h1
          className="font-serif font-normal text-ink leading-[1.1] mb-6"
          style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
        >
          {place.primary}
        </h1>
        {location.tagline && (
          <p className="font-serif text-[18px] text-ink-soft leading-[1.6]">
            {location.tagline}
          </p>
        )}
      </section>

      {/* ─── SECTION 1: CONTACT METHODS ───────────── */}
      <section className="px-[6vw] py-24 border-t border-hairline">
        <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-12">
          {t(locale, 'eyebrow.channels')}
        </p>

        {channels.length > 0 ? (
          <div className="flex flex-col gap-8 max-w-prose">
            <ContactList channels={channels} locale={locale} variant="page" />
            {location.wechatId?.trim() && wechatQrUrl && (
              <Image
                src={wechatQrUrl}
                alt={wechatQrAlt}
                width={300}
                height={300}
              />
            )}
          </div>
        ) : (
          <p className="font-sans text-[15px] text-ink-soft">
            {isZh ? '目前可以通过在线留言联系我们，' : 'For now, the best way to reach us is a message: '}
            <Link
              href={locationPath(locale, slug, '/book#inquiry')}
              className="inline-flex min-h-11 items-center font-semibold text-blue-deep no-underline transition-colors hover:text-ink md:min-h-0"
            >
              {isZh ? '去留言 →' : 'Leave a note →'}
            </Link>
          </p>
        )}
      </section>

      {/* ─── SECTION 2: FIND US ───────────────────── */}
      {(location.address || location.mapEmbedUrl) && (
        <section className="px-[6vw] py-24 border-t border-hairline">
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

      {/* ─── SECTION 3: FAQ ACCORDION ─────────────── */}
      {location.faq && location.faq.length > 0 && (
        <section className="px-[6vw] py-24 border-t border-hairline">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-12">
            {t(locale, 'eyebrow.faq')}
          </p>
          <div className="flex flex-col max-w-prose">
            {location.faq.map((item) => (
              <details
                key={item.id ?? item.q}
                className="group border-b border-hairline py-5 last:border-b-0"
              >
                <summary className="font-serif text-[17px] text-ink cursor-pointer list-none flex items-center justify-between gap-4 select-none">
                  {item.q}
                  <span className="font-sans text-[12px] text-ink-soft transition-transform duration-200 flex-shrink-0 group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="mt-4">
                  {item.a ? (
                    <RichText
                      data={item.a}
                      className="font-sans text-[14px] text-ink-soft leading-[1.75]"
                    />
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
