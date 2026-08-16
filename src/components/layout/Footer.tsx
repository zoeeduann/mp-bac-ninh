'use client'

// Footer is a CLIENT component for the same reason as Header — see the
// comment in Header.tsx. It derives `currentLocation` from usePathname()
// so navigation between sibling routes refreshes per-academy contact info.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { stripLocale, localePath } from '@/lib/locale-url'
import CopyableWechat from '@/components/CopyableWechat'
import TrackedLink from '@/components/analytics/TrackedLink'
import { locationPath } from '@/lib/site-config'

interface LocationDoc {
  slug: string
  name: string
  city: string
  tagline?: string | null
  isThailandNetwork: boolean
  email?: string | null
  phone?: string | null
  wechatId?: string | null
  whatsapp?: string | null
}

/** Build a wa.me deep-link from a WhatsApp value (number or URL). */
function whatsappHref(value: string): string {
  if (value.startsWith('http')) return value
  return `https://wa.me/${value.replace(/[^\d]/g, '')}`
}

interface FooterProps {
  locale: Locale
  allLocations: LocationDoc[]
  siteLocationSlug: string | null
}

export default function Footer({ locale, allLocations, siteLocationSlug }: FooterProps) {
  const pathname = usePathname()
  // usePathname() carries the /en prefix for English — strip it before
  // deriving the academy slug.
  const firstSegment = stripLocale(pathname).split('/').filter(Boolean)[0]
  const currentLocation = allLocations.find(
    (loc) => loc.slug === (siteLocationSlug ?? firstSegment),
  ) ?? null
  const networkLocations = allLocations.filter((loc) => loc.isThailandNetwork)
  const isStandalone = currentLocation?.isThailandNetwork === false

  const loc = currentLocation?.slug ?? null

  // Nav links for the Explore column
  const exploreLinks = loc
    ? [
        { label: t(locale, 'nav.home'), href: locationPath(locale, loc) },
        { label: t(locale, 'nav.activities'), href: locationPath(locale, loc, '/activities') },
        { label: t(locale, 'nav.journal'), href: locationPath(locale, loc, '/journal') },
        { label: t(locale, 'nav.about'), href: locationPath(locale, loc, '/about') },
        { label: t(locale, 'book.cta'), href: locationPath(locale, loc, '/book') },
      ]
    : [
        { label: t(locale, 'nav.network'), href: localePath(locale, '/') },
        // Bare fragment — anchors within the current portal page, locale-agnostic.
        { label: t(locale, 'nav.findAcademy'), href: '#academies' },
      ]

  // Contact info for the Contact column
  const contactInfo = currentLocation
    ? {
        city: currentLocation.city,
        email: currentLocation.email,
        phone: currentLocation.phone,
        wechatId: currentLocation.wechatId,
        whatsapp: currentLocation.whatsapp,
      }
    : null

  return (
    <footer className="bg-gradient-to-b from-paper to-sky-pale text-ink border-t border-hairline pt-24 pb-10 px-[6vw]">
      {/* 5-column grid */}
      <div
        className={[
          'grid grid-cols-1 sm:grid-cols-2 gap-12 mb-20',
          isStandalone
            ? 'md:grid-cols-[2fr_1fr_1fr]'
            : 'md:grid-cols-[2fr_1fr_1fr_1fr_1fr]',
        ].join(' ')}
      >
        {/* Col 1: Brand blurb */}
        <div>
          <p className="font-serif text-xl font-normal text-ink mb-3">
            {isStandalone ? currentLocation.name : '静心学堂 · 泰国'}
          </p>
          {(isStandalone ? currentLocation.tagline : t(locale, 'brand.tagline')) && (
            <p className="font-serif text-[15px] font-normal text-ink/80 tracking-[0.25em] mb-5">
              {isStandalone ? currentLocation.tagline : t(locale, 'brand.tagline')}
            </p>
          )}
          <span className="font-sans text-[12px] font-medium text-ink/55 leading-relaxed max-w-[28ch] block">
            {isStandalone
              ? (locale === 'zh-CN'
                  ? `${currentLocation.name}的独立修学页面。`
                  : `The independent home of ${currentLocation.name}.`)
              : t(locale, 'footer.blurb')}
          </span>
        </div>

        {/* Col 2: Explore */}
        <div>
          <h4 className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink/50 mb-6">
            {t(locale, 'footer.explore')}
          </h4>
          <ul className="list-none flex flex-col gap-4">
            {exploreLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Contact */}
        <div>
          <h4 className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink/50 mb-6">
            {t(locale, 'footer.contact')}
          </h4>
          {contactInfo ? (
            <ul className="list-none flex flex-col gap-4">
              {contactInfo.city && (
                <li>
                  <span className="text-[13px] text-ink/75">{contactInfo.city}</span>
                </li>
              )}
              {contactInfo.email && (
                <li>
                  <TrackedLink
                    href={`mailto:${contactInfo.email}`}
                    analyticsEvent="contact_click"
                    analyticsParameters={{ contact_method: 'email' }}
                    className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
                  >
                    {contactInfo.email}
                  </TrackedLink>
                </li>
              )}
              {contactInfo.phone && (
                <li>
                  <TrackedLink
                    href={`tel:${contactInfo.phone}`}
                    analyticsEvent="contact_click"
                    analyticsParameters={{ contact_method: 'phone' }}
                    className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
                  >
                    {contactInfo.phone}
                  </TrackedLink>
                </li>
              )}
              {contactInfo.wechatId && (
                <li>
                  <span className="text-[13px] text-ink/75">
                    {t(locale, 'footer.wechatLabel')}:{' '}
                    <CopyableWechat
                      id={contactInfo.wechatId}
                      locale={locale}
                      className="font-sans tracking-[0.02em] font-semibold"
                    />
                  </span>
                </li>
              )}
              {contactInfo.whatsapp && (
                <li>
                  <TrackedLink
                    href={whatsappHref(contactInfo.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    analyticsEvent="contact_click"
                    analyticsParameters={{ contact_method: 'whatsapp' }}
                    className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
                  >
                    WhatsApp:{' '}
                    <strong className="font-sans tracking-[0.02em]">{contactInfo.whatsapp}</strong>
                  </TrackedLink>
                </li>
              )}
            </ul>
          ) : (
            <ul className="list-none flex flex-col gap-4">
              {networkLocations.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    href={locationPath(locale, loc.slug)}
                    className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
                  >
                    {loc.city}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Col 4: Thailand network — omitted on standalone academy pages */}
        {!isStandalone && (
          <div>
            <h4 className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink/50 mb-6">
              {t(locale, 'footer.networkLabel')}
            </h4>
            <ul className="list-none flex flex-col gap-4">
              {networkLocations.map((location) => {
                const isCurrent = currentLocation?.slug === location.slug
                return (
                  <li key={location.slug}>
                    <Link
                      href={locationPath(locale, location.slug)}
                      className={[
                        'text-[13px] no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60',
                        isCurrent ? 'text-ink/95 font-semibold' : 'text-ink/75',
                      ].join(' ')}
                    >
                      {location.name}
                      {isCurrent && ' ✓'}
                    </Link>
                  </li>
                )
              })}
              <li>
                <Link
                  href={localePath(locale, '/')}
                  className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
                >
                  {t(locale, 'footer.networkHome')}
                </Link>
              </li>
            </ul>
          </div>
        )}

        {/* Col 5: Related */}
        <div>
          <h4 className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink/50 mb-6">
            {t(locale, 'footer.related')}
          </h4>
          <ul className="list-none flex flex-col gap-4">
            <li>
              <a
                href="https://mindfulpeace.org"
                target="_blank"
                rel="noreferrer"
                className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
              >
                mindfulpeace.org
              </a>
            </li>
            <li>
              <a
                href="https://mindfulpeace.org"
                target="_blank"
                rel="noreferrer"
                className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
              >
                Mindfulpeace International Association
              </a>
            </li>
            {!isStandalone && (
              <li>
                <Link
                  href={localePath(locale, '/topics')}
                  className="inline-block py-0.5 text-[13px] text-ink/75 no-underline transition-all duration-150 hover:text-ink hover:underline hover:underline-offset-4 hover:decoration-sky/60"
                >
                  {locale === 'zh-CN' ? '修学主题' : 'Practice topics'}
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* WeChat ID row — shown when on portal, list all 3 */}
      {!currentLocation && networkLocations.some((l) => l.wechatId) && (
        <div className="mb-8 border-t border-paper/12 pt-8">
          <p className="font-sans text-[11px] font-semibold tracking-[0.16em] uppercase text-ink/50 mb-4">
            {t(locale, 'footer.wechatLabel')}
          </p>
          <div className="flex flex-wrap gap-8">
            {networkLocations
              .filter((l) => l.wechatId)
              .map((l) => (
                <div key={l.slug}>
                  <span className="font-sans text-[11px] text-ink/40 mr-2">{l.city}</span>
                  <CopyableWechat
                    id={l.wechatId as string}
                    locale={locale}
                    className="font-sans tracking-[0.02em] text-[13px] text-ink/75"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="border-t border-paper/12 pt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-[11px] tracking-[0.06em] text-ink/35">
          {isStandalone
            ? `© 2026 ${currentLocation.name}`
            : t(locale, 'footer.copyright')}
        </p>
        {currentLocation && (
          <p className="font-sans text-[11px] tracking-[0.06em] text-ink/35">
            {isStandalone ? currentLocation.city : `${currentLocation.city} · Thailand`}
          </p>
        )}
      </div>
    </footer>
  )
}
