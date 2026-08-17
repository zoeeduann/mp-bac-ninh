'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import TrackedLink from '@/components/analytics/TrackedLink'
import CopyableWechat from '@/components/CopyableWechat'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { stripLocale } from '@/lib/locale-url'
import { locationPath } from '@/lib/site-config'

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

function whatsappHref(value: string): string {
  if (value.startsWith('http')) return value
  return `https://wa.me/${value.replace(/[^\d]/g, '')}`
}

export function socialLabel(link: FooterSocialLink): string {
  if (link.label?.trim()) return link.label.trim()
  try {
    return new URL(link.url).hostname.replace(/^www\./, '')
  } catch {
    return link.url
  }
}

function socialMethod(link: FooterSocialLink): string {
  const identity = `${link.label ?? ''} ${link.url}`.toLowerCase()
  if (identity.includes('facebook')) return 'facebook'
  if (identity.includes('instagram')) return 'instagram'
  if (identity.includes('zalo')) return 'zalo'
  return 'social'
}

const quietLink =
  'text-[13px] leading-relaxed text-ink/70 no-underline transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/50 focus-visible:ring-offset-4'

function SocialArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0 fill-none stroke-current"
    >
      <path
        d="M4 12 12 4M6 4h6v6"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Footer({ locale, allLocations, siteLocationSlug }: FooterProps) {
  const pathname = usePathname()
  const firstSegment = stripLocale(pathname).split('/').filter(Boolean)[0]
  const currentLocation =
    allLocations.find((location) => location.slug === (siteLocationSlug ?? firstSegment)) ?? null
  const isZh = locale === 'zh-CN'

  if (!currentLocation) return null

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
              {currentLocation.name}
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
            <ul className="flex list-none flex-col gap-3.5">
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
              <p className="mb-4 font-serif text-lg">{currentLocation.city}</p>
              <ul className="flex list-none flex-col gap-3">
                {currentLocation.email && (
                  <li>
                    <TrackedLink
                      href={`mailto:${currentLocation.email}`}
                      analyticsEvent="contact_click"
                      analyticsParameters={{ contact_method: 'email' }}
                      className={quietLink}
                    >
                      {currentLocation.email}
                    </TrackedLink>
                  </li>
                )}
                {currentLocation.phone && (
                  <li>
                    <TrackedLink
                      href={`tel:${currentLocation.phone}`}
                      analyticsEvent="contact_click"
                      analyticsParameters={{ contact_method: 'phone' }}
                      className={quietLink}
                    >
                      {currentLocation.phone}
                    </TrackedLink>
                  </li>
                )}
                {currentLocation.wechatId && (
                  <li className="text-[13px] text-ink/70">
                    {t(locale, 'footer.wechatLabel')}:{' '}
                    <CopyableWechat
                      id={currentLocation.wechatId}
                      locale={locale}
                      className="font-sans font-semibold tracking-[0.02em]"
                    />
                  </li>
                )}
                {currentLocation.whatsapp && (
                  <li>
                    <TrackedLink
                      href={whatsappHref(currentLocation.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      analyticsEvent="contact_click"
                      analyticsParameters={{ contact_method: 'whatsapp' }}
                      className={quietLink}
                    >
                      WhatsApp · {currentLocation.whatsapp}
                    </TrackedLink>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {currentLocation.social?.length ? (
          <section
            aria-labelledby="footer-social-heading"
            className="border-b border-ink/10 py-8 md:flex md:items-start md:justify-between md:gap-12"
          >
            <div className="mb-5 md:mb-0 md:w-1/3">
              <h2 id="footer-social-heading" className="font-serif text-base text-ink/80">
                {isZh ? '在日常中相遇' : 'Stay connected'}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-ink/40">
                {isZh
                  ? '关注善明小院的近期活动与分享'
                  : 'News, gatherings and reflections from Bac Ninh'}
              </p>
            </div>
            <div className="flex flex-1 flex-wrap gap-x-6 gap-y-3">
              {currentLocation.social.map((social) => (
                <TrackedLink
                  key={social.url}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  analyticsEvent="contact_click"
                  analyticsParameters={{ contact_method: socialMethod(social) }}
                  className="group inline-flex items-center gap-1.5 text-[13px] text-ink/75 no-underline transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/50"
                >
                  {socialLabel(social)}
                  <span className="text-ink/35 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                    <SocialArrow />
                  </span>
                </TrackedLink>
              ))}
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-6 pt-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink/45">
            <a
              href="https://mindfulpeace.org"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              mindfulpeace.org
            </a>
            <a
              href="https://mindfulpeace.org"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              Mindfulpeace International Association
            </a>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] tracking-[0.08em] text-ink/35">
              © 2026 {currentLocation.name}
            </p>
            <p className="mt-1 text-[10px] tracking-[0.08em] text-ink/30">
              {currentLocation.city} · Vietnam
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
