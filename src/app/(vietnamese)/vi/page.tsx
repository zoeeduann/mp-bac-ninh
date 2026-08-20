import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getPayloadClient } from '@/lib/payload'
import { getFeaturedActivitiesForLocation } from '@/lib/content'
import { SITE_BASE } from '@/lib/site-config'
import BacNinhLogo from '@/components/layout/BacNinhLogo'
import type { Activity, Location, Media } from '@/payload-types'

const title = 'Thiện Minh Tiểu Viện · Bắc Ninh'
const description =
  'Một không gian yên tĩnh để thiền, uống trà, đọc sách và tu học tại Bắc Ninh, Việt Nam.'

const activityTranslations: Record<string, { title: string; description: string }> = {
  'peaceful-zen-tea-wisdom-circle': {
    title: 'Thiền trà an tâm · Đọc ngắn trí tuệ',
    description: 'Sự an tâm đích thực thường đến từ sự chuyên chú trong giây phút hiện tại.',
  },
  'heguang-courtyard-august-in-person-schedule': {
    title: 'Lịch hoạt động trực tiếp tháng 8 tại Thiện Minh Tiểu Viện',
    description: 'Hoạt động cộng đồng · Đặt lịch, tư vấn và đăng ký.',
  },
  'tea-ceremony-seven-forms-training': {
    title: 'Khóa chuyên tu Bảy Pháp Thiền Trà',
    description: 'Chương trình thực hành thiền chánh niệm và trà dành cho cộng đồng.',
  },
}

function mediaUrl(value: number | Media | null | undefined): string | null {
  if (!value || typeof value === 'number') return null
  return value.sizes?.hero?.url ?? value.url ?? null
}

function mediaAlt(value: number | Media | null | undefined, fallback: string): string {
  if (!value || typeof value === 'number') return fallback
  return value.alt || fallback
}

function nextOccurrence(activity: Activity): string | null {
  const now = Date.now()
  const next = (activity.occurrences ?? [])
    .filter(
      (occurrence) =>
        occurrence.startAt &&
        occurrence.status !== 'cancelled' &&
        occurrence.status !== 'deleted' &&
        new Date(occurrence.startAt).getTime() > now,
    )
    .sort(
      (left, right) =>
        new Date(left.startAt).getTime() - new Date(right.startAt).getTime(),
    )[0]
  return next?.startAt ?? null
}

function formatVietnameseDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

function cleanMapUrl(value: string | null | undefined): string | null {
  if (!value) return null
  return value.split('"')[0] || null
}

function vietnameseAddress(value: string | null | undefined): string {
  return (value || 'Đại Đồng, Bắc Ninh, Việt Nam').replace(/越南/g, 'Việt Nam')
}

const getThienMinhLocation = cache(async (): Promise<Location | null> => {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'locations',
    where: { slug: { equals: 'bac-ninh' } },
    limit: 1,
    depth: 2,
    locale: 'en',
    fallbackLocale: 'zh-CN',
    overrideAccess: true,
  })
  return (result.docs[0] as Location | undefined) ?? null
})

export async function generateMetadata(): Promise<Metadata> {
  const location = await getThienMinhLocation()
  const heroUrl = mediaUrl(location?.heroImage as number | Media | null | undefined)

  return {
    metadataBase: new URL(SITE_BASE),
    title,
    description,
    applicationName: 'Thiện Minh Tiểu Viện',
    category: 'Thiền và chánh niệm',
    keywords: [
      'Thiện Minh Tiểu Viện',
      'thiền Bắc Ninh',
      'thiền trà Bắc Ninh',
      'chánh niệm Bắc Ninh',
      'tu học Bắc Ninh',
      'Mindful Peace Yard Bac Ninh',
    ],
    alternates: {
      canonical: `${SITE_BASE}/vi`,
      languages: {
        'zh-CN': SITE_BASE,
        en: `${SITE_BASE}/en`,
        vi: `${SITE_BASE}/vi`,
        'x-default': SITE_BASE,
      },
      types: { 'text/plain': `${SITE_BASE}/vi/llms.txt` },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_BASE}/vi`,
      locale: 'vi_VN',
      type: 'website',
      siteName: 'Thiện Minh Tiểu Viện',
      ...(heroUrl ? { images: [{ url: heroUrl, alt: 'Thiện Minh Tiểu Viện tại Bắc Ninh' }] } : {}),
    },
    twitter: {
      card: heroUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(heroUrl ? { images: [heroUrl] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  }
}

export default async function VietnameseThienMinhPage() {
  const location = await getThienMinhLocation()
  if (!location) notFound()

  const activities = (await getFeaturedActivitiesForLocation(location.id, 'en', 3)) as Activity[]
  const heroUrl = mediaUrl(location.heroImage as number | Media | null | undefined)
  const mapUrl = cleanMapUrl(location.mapEmbedUrl)
  const placeId = `${SITE_BASE}/vi#place`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Place',
      '@id': placeId,
      name: 'Thiện Minh Tiểu Viện',
      alternateName: ['静心小院 · 北宁善明', 'Mindful Peace Yard Bac Ninh'],
      url: `${SITE_BASE}/vi`,
      description,
      address: {
        '@type': 'PostalAddress',
        streetAddress: '4262+VGR, Đại Đồng',
        addressLocality: 'Bắc Ninh',
        addressCountry: 'VN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 21.112274,
        longitude: 106.001353,
      },
      hasMap: mapUrl || undefined,
      image: heroUrl || undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_BASE}/vi#webpage`,
      url: `${SITE_BASE}/vi`,
      name: title,
      description,
      inLanguage: 'vi-VN',
      mainEntity: { '@id': placeId },
      dateModified: location.updatedAt,
    },
    ...activities.flatMap((activity) => {
      const startAt = nextOccurrence(activity)
      if (!startAt) return []
      const translated = activityTranslations[activity.slug]
      return [{
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: translated?.title || activity.title,
        description: translated?.description || activity.shortDesc,
        startDate: startAt,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: { '@id': placeId },
        image: mediaUrl(activity.heroImage as number | Media | null | undefined) || undefined,
        inLanguage: 'vi-VN',
      }]
    }),
  ]

  return (
    <div className="min-h-screen bg-paper text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-ink/10 bg-paper px-[5vw]">
        <Link href="/vi" className="leading-none no-underline" aria-label="Thiện Minh Tiểu Viện">
          <BacNinhLogo />
        </Link>
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.12em] md:flex">
          <Link href="#hoat-dong" className="hover:text-blue-deep">Hoạt động</Link>
          <Link href="#gioi-thieu" className="hover:text-blue-deep">Giới thiệu</Link>
          <Link href="#dia-chi" className="hover:text-blue-deep">Địa chỉ</Link>
        </nav>
        <div className="flex items-center gap-4 text-[11px] font-semibold tracking-[0.1em] text-ink-soft">
          <Link href="/" hrefLang="zh-CN" aria-label="切换到中文" className="hover:text-ink">中</Link>
          <Link href="/en" hrefLang="en" aria-label="Switch to English" className="hover:text-ink">EN</Link>
          <span aria-current="page" className="text-blue-deep">VI</span>
        </div>
      </header>

      <main>
        <section className="relative h-svh max-h-[760px] min-h-[560px] overflow-hidden">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={mediaAlt(location.heroImage as number | Media | null | undefined, 'Thiện Minh Tiểu Viện tại Bắc Ninh')}
              fill
              priority
              className="object-cover object-center saturate-[0.85] brightness-[0.9]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-pale to-sky" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(42,42,51,0.86)_0%,rgba(42,42,51,0.5)_45%,rgba(42,42,51,0.08)_78%)]" />
          <div className="absolute bottom-[12%] left-[8%] max-w-[650px] pr-[6vw] text-paper" style={{ textShadow: 'var(--shadow-hero)' }}>
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-paper/80">Bắc Ninh · Việt Nam</p>
            <h1 className="mb-4 font-serif text-[clamp(42px,7vw,76px)] font-normal leading-[1.08] text-paper">
              Thiện Minh Tiểu Viện
            </h1>
            <p className="mb-10 font-serif text-[clamp(20px,3vw,36px)] leading-[1.3] text-paper/95">
              Một không gian yên tĩnh để tu học tại Bắc Ninh
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="#hoat-dong" className="rounded-full bg-sky px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink no-underline hover:bg-paper">
                Hoạt động sắp tới
              </Link>
              <Link href="#gioi-thieu" className="rounded-full border border-paper/60 px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-paper no-underline hover:border-paper">
                Tìm hiểu tiểu viện
              </Link>
            </div>
          </div>
        </section>

        <section id="hoat-dong" className="px-[6vw] py-28 md:py-36">
          <div className="mx-auto max-w-[1280px]">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Hoạt động sắp tới</p>
            <h2 className="mb-14 font-serif text-[clamp(28px,3.5vw,44px)] font-normal">Những cách để cùng nhau trở về sự tĩnh lặng</h2>
            {activities.length > 0 ? (
              <div className="grid gap-[2px] md:grid-cols-3">
                {activities.map((activity) => {
                  const translated = activityTranslations[activity.slug]
                  const imageUrl = mediaUrl(activity.heroImage as number | Media | null | undefined)
                  const upcoming = nextOccurrence(activity)
                  return (
                    <article key={activity.id}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={mediaAlt(activity.heroImage as number | Media | null | undefined, translated?.title || activity.title)}
                          width={800}
                          height={960}
                          className="aspect-[5/6] w-full object-cover saturate-[0.85]"
                        />
                      ) : (
                        <div className="aspect-[5/6] w-full bg-sky-pale" />
                      )}
                      <div className="border-t border-hairline pb-6 pt-5">
                        {upcoming && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">{formatVietnameseDate(upcoming)}</p>}
                        <h3 className="mb-3 font-serif text-[21px] font-medium leading-[1.4]">{translated?.title || activity.title}</h3>
                        <p className="text-[13px] leading-[1.7] text-ink-soft">{translated?.description || activity.shortDesc}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="py-16 text-center font-serif text-[20px] text-ink-soft">Hiện chưa có lịch hoạt động mới.</p>
            )}
          </div>
        </section>

        <section id="gioi-thieu" className="border-y border-hairline bg-sky-pale/35 px-[6vw] py-28 md:py-36">
          <div className="mx-auto max-w-prose">
            <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Câu chuyện của tiểu viện</p>
            <p className="mb-7 font-serif text-[clamp(18px,2vw,22px)] leading-[1.9]">
              Thiện Minh Tiểu Viện tọa lạc tại Bắc Ninh, là một không gian yên tĩnh đồng hành cùng việc tu học trong đời sống hằng ngày. Chúng tôi không cố truyền dạy điều gì; chỉ cùng nhau ngồi thiền, uống trà, đọc sách và đi bộ. Người ghé thăm sẽ cảm nhận nơi đây không có sự thúc ép, chỉ có một nhịp sống nhẹ nhàng và khoan thai.
            </p>
            <p className="font-serif text-[18px] leading-[1.75] text-ink-soft">
              Thiện Minh Tiểu Viện — không gian tu học tại Bắc Ninh. Cùng ngồi thiền, uống trà, đọc sách và bước đi trong tỉnh thức.
            </p>
          </div>
        </section>

        {(location.address || mapUrl) && (
          <section id="dia-chi" className="px-[6vw] py-28 md:py-36">
            <div className="mx-auto max-w-[1280px]">
              <p className="mb-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Tìm chúng tôi</p>
              <h2 className="mb-5 font-serif text-[clamp(28px,3.5vw,44px)] font-normal">Thiện Minh Tiểu Viện · Bắc Ninh</h2>
              <p className="mb-10 text-[15px] leading-[1.75] text-ink-soft">
                {vietnameseAddress(location.address)}
              </p>
              {mapUrl && (
                <div className="overflow-hidden border border-hairline">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="420"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    className="block border-0"
                    title="Bản đồ Thiện Minh Tiểu Viện"
                  />
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-hairline bg-gradient-to-b from-paper to-sky-pale px-[6vw] py-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 text-[12px] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Thiện Minh Tiểu Viện · Bắc Ninh</p>
          <a href="https://mindfulpeace.org" target="_blank" rel="noreferrer" className="hover:text-ink">mindfulpeace.org</a>
        </div>
      </footer>
    </div>
  )
}
