'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ContactList from '@/components/layout/ContactList'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { stripLocale } from '@/lib/locale-url'
import { locationPath } from '@/lib/site-config'
import { contactChannels } from '@/lib/contact'
import { splitPlaceName, withCountry } from '@/lib/page-title'

export interface FooterSocialLink {
  label?: string | null
  url: string
}

interface LocationDoc {
  slug: string
  name: string
  city: string
  tagline?: string | null
  email?: string | null
  phone?: string | null
  wechatId?: string | null
  whatsapp?: string | null
  social?: FooterSocialLink[] | null
}

interface FooterProps {
  locale: Locale
  allLocations: LocationDoc[]
  siteLocationSlug: string | null
}

export function socialLabel(link: FooterSocialLink): string {
  if (link.label?.trim()) return link.label.trim()
  try {
    return new URL(link.url).hostname.replace(/^www\./, '')
  } catch {
    return link.url
  }
}

const quietLink =
  'inline-flex min-h-11 items-center text-[13px] leading-relaxed text-ink/70 no-underline transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/50 focus-visible:ring-offset-4 md:min-h-0'

export default function Footer({ locale, allLocations, siteLocationSlug }: FooterProps) {
  const pathname = usePathname()
  const firstSegment = stripLocale(pathname).split('/').filter(Boolean)[0]
  const currentLocation =
    allLocations.find((location) => location.slug === (siteLocationSlug ?? firstSegment)) ?? null
  const isZh = locale === 'zh-CN'

  if (!currentLocation) return null

  const place = splitPlaceName(currentLocation.name)
  const channels = contactChannels(currentLocation, locale)

  const exploreLinks = [
    { label: t(locale, 'nav.home'), href: locationPath(locale, currentLocation.slug) },
    {
      label: t(locale, 'nav.activities'),
      href: locationPath(locale, currentLocation.slug, '/activities'),
    },
    {
      label: t(locale, 'nav.journal'),
      href: locationPath(locale, currentLocation.slug, '/journal'),
    },
    {
      label: t(locale, 'nav.about'),
      href: locationPath(locale, currentLocation.slug, '/about'),
    },
    {
      label: t(locale, 'book.cta'),
      href: locationPath(locale, currentLocation.slug, '/book'),
    },
  ]

  return (
    <footer className="border-t border-hairline bg-gradient-to-b from-paper to-sky-pale px-[6vw] pb-9 pt-16 text-ink md:pt-24">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid grid-cols-1 gap-y-14 border-b border-ink/10 pb-14 md:grid-cols-12 md:gap-x-10 md:pb-20">
          <div className="md:col-span-6 md:pr-[12%]">
            <p className="font-serif text-[clamp(1.55rem,2.5vw,2.4rem)] font-normal leading-tight tracking-[-0.025em]">
              {place.primary}
            </p>
            {currentLocation.tagline && (
              <p className="mt-4 max-w-[30rem] font-serif text-[15px] font-normal leading-[1.9] text-ink/65">
                {currentLocation.tagline}
              </p>
            )}
            <p className="mt-8 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-ink/40">
              {isZh ? '越南 · 北宁' : 'Bac Ninh · Vietnam'}
            </p>
          </div>

          <nav aria-label={t(locale, 'footer.explore')} className="md:col-span-2">
            <h2 className="mb-6 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/40">
              {t(locale, 'footer.explore')}
            </h2>
            <ul className="flex list-none flex-col gap-0 md:gap-3.5">
              {exploreLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={quietLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className="mb-6 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/40">
              {t(locale, 'footer.contact')}
            </h2>
            <div className="border-l border-sky/50 pl-5">
              {channels.length > 0 ? (
                <ContactList channels={channels} locale={locale} />
              ) : (
                // Nothing published yet: one useful way to reach the courtyard.
                <Link
                  href={locationPath(locale, currentLocation.slug, '/book#inquiry')}
                  className="inline-flex min-h-11 items-center text-[13px] font-semibold text-blue-deep no-underline transition-colors hover:text-ink md:min-h-0"
                >
                  {isZh ? '在线留言咨询 →' : 'Send us a message →'}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 pt-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-x-5 text-[11px] text-ink/45">
            <a
              href="https://mindfulpeace.org"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0"
            >
              mindfulpeace.org
            </a>
            <a
              href="https://mindfulpeace.org"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center transition-colors hover:text-ink md:min-h-0"
            >
              Mindfulpeace International Association
            </a>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] tracking-[0.08em] text-ink/35">
              © 2026 {place.primary}
            </p>
            <p className="mt-1 text-[10px] tracking-[0.08em] text-ink/30">
              {withCountry(currentLocation.city, isZh ? '越南' : 'Vietnam')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
