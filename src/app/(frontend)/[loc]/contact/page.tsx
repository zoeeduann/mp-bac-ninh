import type { Metadata } from 'next'
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
import { locationUrl } from '@/lib/site-config'
import { JsonLd } from '@/components/JsonLd'
import { faqPageJsonLd } from '@/lib/jsonld'
import { locationSeoKeywords } from '@/lib/seo'
import { academyName } from '@/lib/short-name'
import type { Media } from '@/payload-types'
import CopyableWechat from '@/components/CopyableWechat'
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

  const displayName = academyName(location.city, location.name)
  const inThailandNetwork = isThailandNetworkLocation(location)
  const siteName = locationSiteName(location, locale)
  const pageTitle = locale === 'zh-CN'
    ? `联系 ${displayName}`
    : `Contact ${displayName}`
  const title = inThailandNetwork ? `${pageTitle} — ${siteName}` : pageTitle
  const description = locale === 'zh-CN'
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

  return (
    <div>
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
          {location.name}
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

        <div className="flex flex-col gap-10 max-w-prose">
          {/* Email */}
          {location.email && (
            <div className="flex flex-col gap-1">
              <p className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft">
                {t(locale, 'form.email')}
              </p>
              <TrackedLink
                href={`mailto:${location.email}`}
                analyticsEvent="contact_click"
                analyticsParameters={{ contact_method: 'email' }}
                className="font-sans text-[15px] text-ink no-underline transition-colors duration-150 hover:text-sky"
              >
                {location.email}
              </TrackedLink>
            </div>
          )}

          {/* Phone */}
          {location.phone && (
            <div className="flex flex-col gap-1">
              <p className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft">
                {t(locale, 'form.phone')}
              </p>
              <TrackedLink
                href={`tel:${location.phone}`}
                analyticsEvent="contact_click"
                analyticsParameters={{ contact_method: 'phone' }}
                className="font-sans text-[15px] text-ink no-underline transition-colors duration-150 hover:text-sky"
              >
                {location.phone}
              </TrackedLink>
            </div>
          )}

          {/* WeChat */}
          {location.wechatId && (
            <div className="flex flex-col gap-3">
              <p className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft">
                {t(locale, 'form.wechat')}
              </p>
              <CopyableWechat
                id={location.wechatId}
                locale={locale}
                className="self-start font-sans text-[15px] text-ink tracking-[0.02em]"
              />
              {wechatQrUrl && (
                <Image
                  src={wechatQrUrl}
                  alt={wechatQrAlt}
                  width={300}
                  height={300}
                  className="mt-2"
                />
              )}
            </div>
          )}

          {/* WhatsApp */}
          {location.whatsapp && (
            <div className="flex flex-col gap-1">
              <p className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft">
                WhatsApp
              </p>
              <TrackedLink
                href={
                  location.whatsapp.startsWith('http')
                    ? location.whatsapp
                    : `https://wa.me/${location.whatsapp.replace(/[^\d]/g, '')}`
                }
                target="_blank"
                rel="noreferrer"
                analyticsEvent="contact_click"
                analyticsParameters={{ contact_method: 'whatsapp' }}
                className="font-sans text-[15px] text-ink no-underline transition-colors duration-150 hover:text-sky"
              >
                {location.whatsapp}
              </TrackedLink>
            </div>
          )}

          {/* Social links */}
          {location.social && location.social.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink-soft">
                {isZh ? '社交媒体' : 'Social media'}
              </p>
              {location.social.map((s) => (
                <TrackedLink
                  key={s.id ?? s.url}
                  href={s.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  analyticsEvent="contact_click"
                  analyticsParameters={{
                    contact_method:
                      `${s.label ?? ''} ${s.url ?? ''}`.toLowerCase().includes('zalo')
                        ? 'zalo'
                        : 'social',
                  }}
                  className="font-sans text-[14px] text-sky no-underline transition-colors duration-150 hover:text-ink"
                >
                  {s.label ?? s.url}
                </TrackedLink>
              ))}
            </div>
          )}
        </div>
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
            className="mt-6 inline-flex font-sans text-[13px] font-semibold tracking-[0.04em] text-sky no-underline transition-colors hover:text-ink"
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
