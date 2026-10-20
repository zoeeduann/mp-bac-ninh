import React from 'react'
import Script from 'next/script'
import { Noto_Sans, Noto_Serif, Noto_Serif_SC } from 'next/font/google'
import '../../../styles/tokens.css'
import { getLocale } from '@/lib/route-locale'
import { LOCALES } from '@/lib/i18n'
import { getAllLocations, isThailandNetworkLocation } from '@/lib/current-location'
import Header from '@/components/layout/Header'
import { getZhOnlyDetailPaths } from '@/lib/untranslated-paths'
import Footer from '@/components/layout/Footer'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import {
  GOOGLE_ANALYTICS_ID,
  SITE_BASE,
  SITE_LOCATION_SLUG,
} from '@/lib/site-config'

// VI A-15 specifies HarmonyOS Sans SC ("端庄") for body / formal sans. That face is
// not on Google Fonts, and we no longer ship a CJK sans webfont: Noto Sans SC
// alone cost ~18 unicode-range files (~1 MB) per Chinese page on mobile. With
// --font-sans unset here, tokens.css falls back to HarmonyOS Sans SC if
// installed, else the OS Chinese sans (PingFang SC / Noto Sans CJK on Android /
// Microsoft YaHei). The serif below stays: no OS ships it reliably.
const notoSerifSC = Noto_Serif_SC({
  // next/font 15 does not expose 'chinese-simplified' in the type union;
  // omitting subsets + preload:false is the correct pattern for CJK fonts.
  preload: false,
  weight: ['400', '500', '700'],
  variable: '--font-serif',
  display: 'swap',
})

// Latin faces placed ahead of the CJK faces on English pages (tokens.css).
const notoSans = Noto_Sans({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  // Only English pages use the Latin faces (tokens.css); preloading them made
  // every Chinese page fetch six font files ahead of the hero image.
  preload: false,
  variable: '--font-latin-sans',
  display: 'swap',
})

const notoSerif = Noto_Serif({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '700'],
  preload: false,
  variable: '--font-latin-serif',
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL(SITE_BASE),
  description: '越南北宁善明静心小院的禅修、禅茶与正念活动。Meditation, tea and mindfulness in Bac Ninh, Vietnam.',
  title: '越南北宁善明静心小院｜Bac Ninh, Vietnam',
}

// Pre-render both languages so rewritten Chinese URLs also resolve to an
// existing ISR entry. Keep each language's HTML separate and refresh it every
// five minutes (or immediately when a CMS write revalidates the public pages).
export const revalidate = 300
export function generateStaticParams(): { locale: string }[] {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function RootLayout(props: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { children, params } = props

  const locale = await getLocale(params)
  // Header/Footer derive `currentLocation` client-side from usePathname()
  // (so client navigation refreshes their state). Layout only needs to
  // fetch the full list of academies once.
  const [allLocations, zhOnlyPaths] = await Promise.all([
    getAllLocations(locale),
    // Only Chinese pages link to an English counterpart that may not exist.
    locale === 'zh-CN' ? getZhOnlyDetailPaths() : Promise.resolve([]),
  ])

  type SocialInput = { label?: unknown; url?: unknown }

  // Normalize location docs to the shape Header/Footer expect
  function normalize(doc: any) {
    const logoDoc = typeof doc.logo === 'object' && doc.logo ? doc.logo : null
    const logoSized = logoDoc?.sizes?.card?.url ?? logoDoc?.url ?? null
    return {
      slug: doc.slug,
      name: typeof doc.name === 'string' ? doc.name : (doc.name?.['zh-CN'] ?? doc.slug),
      city: typeof doc.city === 'string' ? doc.city : (doc.city?.['zh-CN'] ?? ''),
      tagline: typeof doc.tagline === 'string' ? doc.tagline : null,
      isThailandNetwork: isThailandNetworkLocation(doc),
      email: doc.email ?? null,
      phone: doc.phone ?? null,
      wechatId: doc.wechatId ?? null,
      whatsapp: doc.whatsapp ?? null,
      social: Array.isArray(doc.social)
        ? doc.social
            .filter((item: SocialInput) => typeof item?.url === 'string' && item.url.trim())
            .map((item: SocialInput) => ({
              label: typeof item.label === 'string' ? item.label : null,
              url: (item.url as string).trim(),
            }))
        : [],
      logo: logoSized
        ? {
            url: logoSized as string,
            width: (logoDoc?.sizes?.card?.width ?? logoDoc?.width ?? 0) as number,
            height: (logoDoc?.sizes?.card?.height ?? logoDoc?.height ?? 0) as number,
            alt: (logoDoc?.alt ?? '') as string,
          }
        : null,
    }
  }

  // The database is shared with the Thailand academies. A dedicated
  // deployment only ships its own academy's details to the browser.
  const siteLocations = SITE_LOCATION_SLUG
    ? (allLocations as any[]).filter((doc) => doc.slug === SITE_LOCATION_SLUG)
    : (allLocations as any[])
  const normalizedAll = siteLocations.map(normalize)

  return (
    <html
      lang={locale}
      className={`${notoSerifSC.variable} ${notoSans.variable} ${notoSerif.variable}`}
    >
      <body>
        {GOOGLE_ANALYTICS_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GOOGLE_ANALYTICS_ID}');
              `}
            </Script>
          </>
        )}
        <Header
          locale={locale}
          allLocations={normalizedAll}
          siteLocationSlug={SITE_LOCATION_SLUG}
          zhOnlyPaths={zhOnlyPaths}
        />
        <main>{children}</main>
        <Footer
          locale={locale}
          allLocations={normalizedAll}
          siteLocationSlug={SITE_LOCATION_SLUG}
        />
        {/* Vercel Analytics (page views, referrers, geo) + Speed Insights
            (Core Web Vitals). Both honor Do Not Track and use no cookies.
            Scoped to the (frontend) route group only — the admin layout
            doesn't include them. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
