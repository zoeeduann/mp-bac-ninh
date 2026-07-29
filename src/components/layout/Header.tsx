'use client'

// Header is a CLIENT component so it re-derives the current academy from
// the URL on every navigation via usePathname(). The previous server-only
// version received `currentLocation` as a prop computed in layout.tsx from
// request headers — but Next.js App Router shares the layout RSC payload
// across sibling routes inside the same group, so navigating /chiangmai → /
// left the header stuck on chiangmai chrome.

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { stripLocale, localePath } from '@/lib/locale-url'
import LocationChip from './LocationChip'
import LanguageToggle from './LanguageToggle'
import HeaderClient from './HeaderClient'
import { locationPath } from '@/lib/site-config'

interface LocationDoc {
  slug: string
  name: string
  city: string
  isThailandNetwork: boolean
  logo?: { url: string; width: number; height: number; alt: string } | null
}

interface HeaderProps {
  locale: Locale
  allLocations: LocationDoc[]
  siteLocationSlug: string | null
}

function buildNavItems(
  locale: Locale,
  currentLocation: LocationDoc | null,
): { label: string; href: string }[] {
  if (!currentLocation) {
    // Portal nav — flat 4-item structure with anchor links to homepage sections.
    return [
      { label: t(locale, 'nav.home'), href: localePath(locale, '/') },
      { label: t(locale, 'nav.about_us'), href: localePath(locale, '/#about-network') },
      { label: t(locale, 'nav.activities'), href: localePath(locale, '/#academies') },
      { label: t(locale, 'nav.contact_us'), href: localePath(locale, '/#contact') },
    ]
  }
  const loc = currentLocation.slug
  return [
    { label: t(locale, 'nav.home'), href: locationPath(locale, loc) },
    { label: t(locale, 'nav.activities'), href: locationPath(locale, loc, '/activities') },
    { label: t(locale, 'nav.journal'), href: locationPath(locale, loc, '/journal') },
    { label: t(locale, 'nav.about'), href: locationPath(locale, loc, '/about') },
  ]
}

export default function Header({ locale, allLocations, siteLocationSlug }: HeaderProps) {
  // Derive the current academy from the live URL — re-runs on every
  // client-side navigation, fixing the stale-layout caching bug.
  const pathname = usePathname()
  // usePathname() returns the EXTERNAL path (with /en for English); strip the
  // locale prefix before deriving the academy slug.
  const firstSegment = stripLocale(pathname).split('/').filter(Boolean)[0]
  const currentLocation = allLocations.find(
    (loc) => loc.slug === (siteLocationSlug ?? firstSegment),
  ) ?? null
  const networkLocations = allLocations.filter((loc) => loc.isThailandNetwork)
  const isStandalone = currentLocation?.isThailandNetwork === false
  const isBacNinh = currentLocation?.slug === 'bac-ninh'

  const navItems = buildNavItems(locale, currentLocation)

  return (
    <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-[4vw] bg-paper border-b border-ink/10">
      {/* Left: brand + location chip */}
      <div className="flex items-center gap-5">
        {isBacNinh ? (
          <Link
            href={locationPath(locale, currentLocation.slug)}
            className="flex items-center gap-3 leading-none"
            aria-label={currentLocation.name}
          >
            <Image
              src="/brand/mindful-peace-yard-logo.svg"
              alt="静心小院 · Mindful Peace Yard"
              width={256}
              height={101}
              priority
              className="h-11 w-auto max-w-[180px] sm:h-12"
            />
            <span aria-hidden="true" className="h-8 w-px bg-ink/25 sm:h-9" />
            <span className="flex flex-col whitespace-nowrap leading-none">
              <span className="font-serif text-[16px] font-medium tracking-[0.06em] text-ink sm:text-[18px]">
                北宁善明
              </span>
              <span className="mt-1 font-sans text-[8px] font-medium tracking-[0.08em] text-ink-soft sm:text-[9px]">
                Bac Ninh
              </span>
            </span>
          </Link>
        ) : currentLocation?.logo ? (
          <Link
            href={locationPath(locale, currentLocation.slug)}
            className="block leading-none"
            aria-label={currentLocation.logo.alt || currentLocation.name}
          >
            <Image
              src={currentLocation.logo.url}
              alt={currentLocation.logo.alt || currentLocation.name}
              width={currentLocation.logo.width || 600}
              height={currentLocation.logo.height || 218}
              priority
              className="h-10 w-auto max-w-[260px] mix-blend-multiply"
            />
          </Link>
        ) : isStandalone ? (
          <Link
            href={locationPath(locale, currentLocation.slug)}
            className="font-serif text-[clamp(16px,2vw,22px)] font-medium tracking-[0.06em] text-ink no-underline whitespace-nowrap"
            aria-label={currentLocation.name}
          >
            {currentLocation.name}
          </Link>
        ) : (
          <Link
            href={localePath(locale, '/')}
            className="flex items-center gap-3 leading-none"
            aria-label="静心学堂 · Mindful Peace Academy · 泰国"
          >
            <Image
              src="/brand/master-logo.png"
              alt="静心学堂 · Mindful Peace Academy"
              width={1114}
              height={374}
              priority
              // mix-blend-multiply drops the PNG's white bg so the logo
              // blends into any light surface (header has bg-paper/85).
              className="h-10 w-auto mix-blend-multiply"
            />
            <span aria-hidden="true" className="w-px h-7 bg-ink/25" />
            <span className="flex flex-col leading-tight">
              <span className="font-sans text-[15px] font-medium text-ink tracking-[0.05em]">
                泰国
              </span>
              <span className="font-sans text-[10px] font-medium tracking-[0.08em] text-ink-soft">
                Thailand
              </span>
            </span>
          </Link>
        )}

        {!isStandalone && (
          <LocationChip
            current={currentLocation}
            all={networkLocations}
            locale={locale}
          />
        )}
      </div>

      {/* Center: desktop nav */}
      <nav className="hidden md:flex" aria-label="Main navigation">
        <ul className="flex items-center gap-10 list-none">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-ink no-underline transition-colors duration-150 hover:text-sky"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Right: lang toggle + book CTA + hamburger */}
      <div className="flex items-center gap-6">
        <LanguageToggle current={locale} />

        {currentLocation && (
          <Link
            href={locationPath(locale, currentLocation.slug, '/book')}
            className="hidden sm:inline-flex font-sans text-[11px] font-semibold tracking-[0.12em] uppercase text-ink bg-sky rounded-full px-5 py-[0.45rem] no-underline whitespace-nowrap transition-colors duration-150 hover:bg-blue-deep hover:text-paper"
          >
            {t(locale, 'book.cta')}
          </Link>
        )}

        <HeaderClient
          locale={locale}
          navItems={navItems}
          locationSlug={currentLocation?.slug ?? null}
        />
      </div>
    </header>
  )
}
