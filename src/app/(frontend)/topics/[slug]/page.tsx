import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { getThailandNetworkLocations } from '@/lib/current-location'
import { getFeaturedActivitiesForLocation } from '@/lib/content'
import { getLocale } from '@/lib/i18n'
import { breadcrumbJsonLd, itemListJsonLd, plainFaqPageJsonLd } from '@/lib/jsonld'
import { localePath, localizedUrl } from '@/lib/locale-url'
import { buildMetadata, BASE } from '@/lib/metadata'
import { academyName } from '@/lib/short-name'
import { seoKeywords } from '@/lib/seo'
import {
  getTopicPage,
  TOPIC_LAST_MODIFIED,
  TOPIC_PAGES,
  topicPath,
  topicText,
} from '@/lib/topic-pages'
import type { Activity, Location, Media } from '@/payload-types'

export function generateStaticParams() {
  return TOPIC_PAGES.map((topic) => ({ slug: topic.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const topic = getTopicPage(slug)
  if (!topic) return {}

  const title = topicText(topic.title, locale)
  const description = topicText(topic.description, locale)

  return buildMetadata({
    title: `${title}｜静心学堂 · 泰国`,
    description,
    url: localizedUrl(locale, topicPath(topic.slug), BASE),
    locale,
    keywords: seoKeywords(locale, topic.keywords[locale]),
    alternateLanguages: {
      'zh-CN': localizedUrl('zh-CN', topicPath(topic.slug), BASE),
      en: localizedUrl('en', topicPath(topic.slug), BASE),
    },
  })
}

function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return img.url ?? null
}

function mediaAlt(img: number | Media | null | undefined, fallback = ''): string {
  if (!img || typeof img === 'number') return fallback
  return img.alt ?? fallback
}

function topicWebPageJsonLd(input: {
  name: string
  description: string
  url: string
  locale: string
  keywords: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${input.url}#webpage`,
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.locale,
    dateModified: TOPIC_LAST_MODIFIED,
    isPartOf: { '@id': `${BASE.replace(/\/$/, '')}/#website` },
    publisher: { '@id': `${BASE.replace(/\/$/, '')}/#organization` },
    about: input.keywords.map((name) => ({ '@type': 'Thing', name })),
  }
}

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()])
  const topic = getTopicPage(slug)
  if (!topic) notFound()

  const isZh = locale === 'zh-CN'
  const pageUrl = localizedUrl(locale, topicPath(topic.slug), BASE)

  const locations = (await getThailandNetworkLocations(locale)) as Array<
    Location & { heroImage?: Media | number | null }
  >
  const locationBySlug = new Map(locations.map((location) => [location.slug, location]))
  const relatedLocations = topic.citySlugs
    .map((citySlug) => locationBySlug.get(citySlug))
    .filter((location): location is Location & { heroImage?: Media | number | null } =>
      Boolean(location),
    )

  const activitiesByLocation = await Promise.all(
    relatedLocations.map(async (location) => ({
      location,
      activities: (await getFeaturedActivitiesForLocation(location.id, locale, 2)) as Activity[],
    })),
  )

  const heroLocation = relatedLocations[0] ?? locations[0]
  const heroImage = mediaUrl(heroLocation?.heroImage)
  const title = topicText(topic.title, locale)
  const description = topicText(topic.description, locale)
  const topicKeywords = topic.keywords[locale]

  const breadcrumb = breadcrumbJsonLd([
    { name: isZh ? '总门户' : 'Network', url: localizedUrl(locale, '/', BASE) },
    { name: isZh ? '修学主题' : 'Practice topics', url: localizedUrl(locale, '/topics', BASE) },
    { name: title, url: pageUrl },
  ])
  const faq = plainFaqPageJsonLd(
    topic.faq.map((item) => ({
      question: topicText(item.question, locale),
      answer: topicText(item.answer, locale),
    })),
  )
  const relatedAcademies = itemListJsonLd({
    name: isZh ? `${title}相关学堂` : `${title} academies`,
    url: pageUrl,
    items: relatedLocations.map((location) => ({
      name: academyName(location.city, location.name),
      url: localizedUrl(locale, `/${location.slug}`, BASE),
      description: location.tagline,
      imageUrl: mediaUrl(location.heroImage),
    })),
  })

  return (
    <div>
      <JsonLd
        data={[
          breadcrumb,
          topicWebPageJsonLd({
            name: title,
            description,
            url: pageUrl,
            locale,
            keywords: topicKeywords,
          }),
          relatedAcademies,
          ...(faq ? [faq] : []),
        ]}
      />

      <section className="relative min-h-[520px] overflow-hidden bg-ink text-paper">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={mediaAlt(heroLocation?.heroImage, title)}
            fill
            priority
            className="object-cover object-center saturate-[0.82] brightness-[0.58]"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-ink" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(42,42,51,0.86) 0%, rgba(42,42,51,0.58) 48%, rgba(42,42,51,0.18) 100%)',
          }}
        />
        <div className="relative px-[6vw] py-24 min-h-[520px] flex items-end">
          <div className="max-w-[760px]">
            <p className="font-sans text-[11px] font-semibold tracking-[0.18em] uppercase text-paper/70 mb-5">
              {topicText(topic.eyebrow, locale)}
            </p>
            <h1
              className="font-serif font-normal leading-[1.08] tracking-[0.02em] mb-7"
              style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}
            >
              {title}
            </h1>
            <p className="font-serif text-[clamp(18px,2vw,24px)] leading-[1.7] text-paper/88 max-w-[48ch]">
              {topicText(topic.intro, locale)}
            </p>
          </div>
        </div>
      </section>

      <section className="px-[6vw] py-20 border-b border-hairline">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topic.keyPoints.map((point, index) => (
            <div key={index} className="border-t border-ink/20 pt-6">
              <span className="font-sans text-[11px] font-semibold tracking-[0.16em] text-sky">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="font-serif text-[18px] leading-[1.65] text-ink mt-4">
                {topicText(point, locale)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6vw] py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-16">
          <div>
            <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
              {isZh ? '相关学堂' : 'Related academies'}
            </p>
            <h2 className="font-serif font-normal text-[clamp(26px,3vw,40px)] leading-[1.25] text-ink mb-6">
              {isZh ? '按城市进入真实场景' : 'Start from a real place'}
            </h2>
            <p className="font-sans text-[15px] leading-[1.9] text-ink-soft">{description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
            {relatedLocations.map((location) => {
              const image = mediaUrl(location.heroImage)
              const name = academyName(location.city, location.name)
              return (
                <Link
                  key={location.slug}
                  href={localePath(locale, `/${location.slug}`)}
                  className="group block border border-hairline bg-paper/50 no-underline text-inherit overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-ink/10">
                    {image && (
                      <Image
                        src={image}
                        alt={mediaAlt(location.heroImage, name)}
                        fill
                        className="object-cover saturate-[0.82] transition-transform duration-500 group-hover:scale-[1.025]"
                        sizes="(min-width: 1024px) 28vw, (min-width: 640px) 44vw, 88vw"
                      />
                    )}
                  </div>
                  <div className="p-6">
                    <p className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-2">
                      {location.city}
                    </p>
                    <h3 className="font-serif text-[24px] font-normal text-ink leading-[1.2] mb-3">
                      {name}
                    </h3>
                    {location.tagline && (
                      <p className="font-sans text-[13px] leading-[1.7] text-ink-soft">
                        {location.tagline}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {activitiesByLocation.some((entry) => entry.activities.length > 0) && (
        <section className="px-[6vw] py-24 border-t border-hairline">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
            {isZh ? '近期活动' : 'Upcoming activities'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {activitiesByLocation.flatMap(({ location, activities }) =>
              activities.map((activity) => (
                <Link
                  key={`${location.slug}-${activity.id}`}
                  href={localePath(locale, `/${location.slug}/activities/${activity.slug}`)}
                  className="block border-t border-ink/20 pt-6 no-underline text-inherit"
                >
                  <p className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-3">
                    {location.city}
                  </p>
                  <h3 className="font-serif text-[22px] leading-[1.25] font-normal text-ink mb-3">
                    {activity.title}
                  </h3>
                  {activity.shortDesc && (
                    <p className="font-sans text-[13px] leading-[1.75] text-ink-soft">
                      {activity.shortDesc}
                    </p>
                  )}
                </Link>
              )),
            )}
          </div>
        </section>
      )}

      <section className="px-[6vw] py-24 border-t border-hairline">
        <div className="max-w-[880px]">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-8">
            {isZh ? '常见问题' : 'FAQ'}
          </p>
          <div className="divide-y divide-ink/10">
            {topic.faq.map((item) => (
              <div key={topicText(item.question, locale)} className="py-8">
                <h2 className="font-serif text-[24px] font-normal leading-[1.35] text-ink mb-4">
                  {topicText(item.question, locale)}
                </h2>
                <p className="font-sans text-[15px] leading-[1.9] text-ink-soft">
                  {topicText(item.answer, locale)}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-10">
            <Link
              href={localePath(locale, '/topics')}
              className="font-sans text-[13px] font-semibold tracking-[0.08em] text-sky no-underline transition-colors duration-150 hover:text-ink"
            >
              {isZh ? '← 返回全部主题' : '← Back to all topics'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
