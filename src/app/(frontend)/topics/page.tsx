import type { Metadata } from 'next'
import Link from 'next/link'

import BodhiBackdrop from '@/components/brand/BodhiBackdrop'
import { JsonLd } from '@/components/JsonLd'
import { buildMetadata, BASE } from '@/lib/metadata'
import { localePath, localizedUrl } from '@/lib/locale-url'
import { getLocale } from '@/lib/i18n'
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/jsonld'
import { seoKeywords } from '@/lib/seo'
import { TOPIC_PAGES, topicPath, topicText } from '@/lib/topic-pages'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isZh = locale === 'zh-CN'

  return buildMetadata({
    title: isZh ? '修学主题｜静心学堂 · 泰国' : 'Practice Topics | Mindfulpeace Academy Thailand',
    description: isZh
      ? '佛学、禅修、正念、冥想、静坐、禅茶与初学者修学主题导览，连接曼谷、清迈、普吉三处静心学堂。'
      : 'Guides to Buddhist study, Zen meditation, mindfulness, sitting practice, tea meditation, and beginner practice across Bangkok, Chiang Mai, and Phuket.',
    url: localizedUrl(locale, '/topics', BASE),
    locale,
    keywords: seoKeywords(locale, [
      isZh ? '修学主题' : 'practice topics',
      isZh ? '泰国佛学' : 'Buddhist study Thailand',
      isZh ? '泰国禅修' : 'meditation Thailand',
    ]),
    alternateLanguages: {
      'zh-CN': localizedUrl('zh-CN', '/topics', BASE),
      en: localizedUrl('en', '/topics', BASE),
    },
  })
}

export default async function TopicsIndexPage() {
  const locale = await getLocale()
  const isZh = locale === 'zh-CN'
  const pageUrl = localizedUrl(locale, '/topics', BASE)

  const breadcrumb = breadcrumbJsonLd([
    { name: isZh ? '总门户' : 'Network', url: localizedUrl(locale, '/', BASE) },
    { name: isZh ? '修学主题' : 'Practice topics', url: pageUrl },
  ])
  const itemList = itemListJsonLd({
    name: isZh ? '静心学堂 · 泰国修学主题' : 'Mindfulpeace Academy Thailand practice topics',
    url: pageUrl,
    items: TOPIC_PAGES.map((topic) => ({
      name: topicText(topic.title, locale),
      description: topicText(topic.description, locale),
      url: localizedUrl(locale, topicPath(topic.slug), BASE),
    })),
  })

  return (
    <div>
      <JsonLd data={[breadcrumb, itemList]} />

      <section className="relative overflow-hidden px-[6vw] py-28 border-b border-hairline bg-paper">
        <BodhiBackdrop variant="right" mode="light" />
        <div className="relative max-w-[920px]">
          <p className="font-sans text-[12px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
            {isZh ? '佛学 · 禅修 · 正念' : 'Buddhism · Zen · mindfulness'}
          </p>
          <h1
            className="font-serif font-normal text-ink leading-[1.14] mb-7"
            style={{ fontSize: 'clamp(34px, 5vw, 64px)' }}
          >
            {isZh ? '修学主题导览' : 'Practice Topic Guides'}
          </h1>
          <p className="font-serif text-[clamp(18px,2vw,24px)] leading-[1.7] text-ink/78 max-w-[44ch]">
            {isZh
              ? '从佛学入门到禅修、静坐、正念与禅茶练习，找到适合自己的修学方向，并了解曼谷、清迈、普吉的学堂与活动。'
              : 'From Buddhist study to Zen meditation, sitting practice, mindfulness and tea meditation, find a practice direction that fits you and learn about academies and activities in Bangkok, Chiang Mai and Phuket.'}
          </p>
        </div>
      </section>

      <section className="px-[6vw] py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[2px]">
          {TOPIC_PAGES.map((topic) => (
            <Link
              key={topic.slug}
              href={localePath(locale, topicPath(topic.slug))}
              className="group block min-h-[320px] border border-hairline bg-paper/55 p-8 no-underline text-inherit transition-colors duration-150 hover:bg-sky-pale"
            >
              <p className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-ink-soft mb-5">
                {topicText(topic.eyebrow, locale)}
              </p>
              <h2 className="font-serif text-[26px] leading-[1.2] font-normal text-ink mb-5">
                {topicText(topic.title, locale)}
              </h2>
              <p className="font-sans text-[14px] leading-[1.8] text-ink-soft mb-8">
                {topicText(topic.description, locale)}
              </p>
              <span className="font-sans text-[12px] font-semibold tracking-[0.08em] text-sky transition-colors duration-150 group-hover:text-ink">
                {isZh ? '进入主题 →' : 'Open guide →'}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
