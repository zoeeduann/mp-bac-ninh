import React from 'react'
import Script from 'next/script'
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import '../../styles/tokens.css'
import { getLocale } from '@/lib/i18n'
import { getAllLocations, isThailandNetworkLocation } from '@/lib/current-location'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SITE_BASE, SITE_LOCATION_SLUG } from '@/lib/site-config'

// VI A-15 specifies HarmonyOS Sans SC ("端庄") for body / formal sans. That face is
// not on Google Fonts; Noto Sans SC is the closest open-source alternative with
// full CJK coverage and a similar humanist-geometric feel. The Tailwind stack
// below prefers HarmonyOS Sans SC if installed locally (e.g. on Huawei devices),
// then falls back to Noto Sans SC, then OS Chinese sans, then system-ui.
const notoSansSC = Noto_Sans_SC({
  preload: false, // CJK fonts shouldn't preload — Latin subset is small but full CJK is huge
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const notoSerifSC = Noto_Serif_SC({
  // next/font 15 does not expose 'chinese-simplified' in the type union;
  // omitting subsets + preload:false is the correct pattern for CJK fonts.
  preload: false,
  weight: ['400', '500', '700'],
  variable: '--font-serif',
  display: 'swap',
})

const googleAnalyticsId = 'G-Y8SDHSFT9N'

export const metadata = {
  metadataBase: new URL(SITE_BASE),
  description: 'Bilingual site for Mindfulpeace Academy Thailand — three meditation academies in Bangkok, Chiang Mai, and Phuket.',
  title: '静心学堂 · 泰国 / Mindfulpeace Academy Thailand',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  const locale = await getLocale()
  // Header/Footer derive `currentLocation` client-side from usePathname()
  // (so client navigation refreshes their state). Layout only needs to
  // fetch the full list of academies once.
  const allLocations = await getAllLocations(locale)

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

  const normalizedAll = (allLocations as any[]).map(normalize)

  return (
    <html
      lang={locale}
      className={`${notoSansSC.variable} ${notoSerifSC.variable}`}
    >
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
        <Header
          locale={locale}
          allLocations={normalizedAll}
          siteLocationSlug={SITE_LOCATION_SLUG}
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
