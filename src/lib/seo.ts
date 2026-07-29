import type { Locale } from './i18n'

const NETWORK_TERMS_ZH = [
  '静心学堂',
  '静心学堂 · 泰国',
  '泰国静心学堂',
  '佛学',
  '佛法',
  '禅',
  '禅修',
  '禅坐',
  '静坐',
  '正念',
  '冥想',
  '打坐',
  '禅茶',
  '读书会',
  '生命觉醒教育',
  '身心安顿',
  '曼谷佛学',
  '清迈佛学',
  '普吉佛学',
  '曼谷禅修',
  '清迈禅修',
  '普吉禅修',
]

const NETWORK_TERMS_EN = [
  'Mindfulpeace Academy Thailand',
  'Mindful Peace Academy Thailand',
  'Jingxin Academy Thailand',
  'Buddhism',
  'Buddhist study',
  'Buddhist practice',
  'Zen',
  'Zen meditation',
  'meditation',
  'mindfulness',
  'sitting meditation',
  'tea meditation',
  'contemplative practice',
  'spiritual practice Thailand',
  'meditation Thailand',
  'meditation Bangkok',
  'meditation Chiang Mai',
  'meditation Phuket',
  'Zen Thailand',
  'Buddhism Thailand',
]

export const NETWORK_ALTERNATE_NAMES = [
  '静心学堂',
  '静心学堂泰国',
  '静心学堂 · 泰国',
  'Mindfulpeace Academy Thailand',
  'Mindful Peace Academy Thailand',
  'Mindfulpeace Thailand',
  'Jingxin Academy',
  'Jingxin Academy Thailand',
  'Jing Xin Academy',
]

export function seoKeywords(locale: Locale, extra: Array<string | null | undefined> = []): string[] {
  const base = locale === 'zh-CN' ? NETWORK_TERMS_ZH : NETWORK_TERMS_EN
  return unique([...base, ...extra])
}

export function seoKeywordText(
  locale: Locale,
  extra: Array<string | null | undefined> = [],
): string {
  return seoKeywords(locale, extra).join(', ')
}

export function networkSeoDescription(locale: Locale): string {
  return locale === 'zh-CN'
    ? '静心学堂 · 泰国在曼谷、清迈、普吉提供佛学、禅修、正念、静坐、禅茶、读书与一对一指导，多数活动免费，欢迎预约到访。'
    : 'Mindfulpeace Academy Thailand offers Buddhism, Zen meditation, mindfulness, sitting practice, tea meditation, reading, and guidance in Bangkok, Chiang Mai, and Phuket.'
}

export function locationSeoKeywords(
  locale: Locale,
  city: string,
  displayName: string,
  extra: Array<string | null | undefined> = [],
  includeThailandNetwork = true,
): string[] {
  const cityTerms =
    locale === 'zh-CN'
      ? [
          displayName,
          city,
          `${city}静心学堂`,
          `${city}佛学`,
          `${city}禅修`,
          `${city}正念`,
          `${city}冥想`,
          `${city}打坐`,
          `${city}禅茶`,
          `${displayName}佛学`,
          `${displayName}禅修`,
        ]
      : [
          displayName,
          city,
          `${city} meditation`,
          `${city} Zen`,
          `${city} Buddhism`,
          `${city} mindfulness`,
          `Zen meditation ${city}`,
          `Buddhist practice ${city}`,
          `${displayName} meditation`,
          `${displayName} Zen`,
        ]

  const neutralTerms = (locale === 'zh-CN' ? NETWORK_TERMS_ZH : NETWORK_TERMS_EN)
    .filter((term) =>
      locale === 'zh-CN'
        ? !/(泰国|曼谷|清迈|普吉)/.test(term)
        : !/(Thailand|Bangkok|Chiang Mai|Phuket)/i.test(term),
    )

  return unique([
    ...(includeThailandNetwork
      ? (locale === 'zh-CN' ? NETWORK_TERMS_ZH : NETWORK_TERMS_EN)
      : neutralTerms),
    ...cityTerms,
    ...extra,
  ])
}

export function locationSeoDescription(input: {
  locale: Locale
  displayName: string
  city: string
  tagline?: string | null
}): string {
  const { locale, displayName, city, tagline } = input
  const suffix =
    locale === 'zh-CN'
      ? `${displayName}坐落于${city}，提供佛学、禅修、正念、静坐、禅茶、读书与身心安顿活动，欢迎预约到访。`
      : `${displayName} in ${city} offers Buddhism, Zen meditation, mindfulness, sitting practice, tea meditation, reading, and visits by appointment.`

  return truncateDescription([clean(tagline), suffix].filter(Boolean).join(' '), locale)
}

export function activitySeoKeywords(input: {
  locale: Locale
  title: string
  displayName: string
  city: string
  categoryName?: string | null
  includeThailandNetwork?: boolean
}): string[] {
  const {
    locale,
    title,
    displayName,
    city,
    categoryName,
    includeThailandNetwork = true,
  } = input
  return locationSeoKeywords(locale, city, displayName, [
    title,
    categoryName,
    locale === 'zh-CN' ? `${title} 预约` : `${title} booking`,
    locale === 'zh-CN' ? `${title} 禅修` : `${title} meditation`,
  ], includeThailandNetwork)
}

export function activitySeoDescription(input: {
  locale: Locale
  title: string
  displayName: string
  city: string
  shortDesc?: string | null
  seoDescription?: string | null
}): string {
  const { locale, title, displayName, city, shortDesc, seoDescription } = input
  if (clean(seoDescription)) return truncateDescription(clean(seoDescription), locale)

  const suffix =
    locale === 'zh-CN'
      ? `在${city}${displayName}参加「${title}」，体验佛学、禅修、正念与静坐修学，可查看场次并预约。`
      : `Join "${title}" at ${displayName} in ${city}: Buddhism, Zen meditation, mindfulness, and contemplative practice. View sessions and book a visit.`

  return truncateDescription([clean(shortDesc), suffix].filter(Boolean).join(' '), locale)
}

export function seoTopics(locale: Locale): string[] {
  return locale === 'zh-CN'
    ? ['佛学', '佛法', '禅', '禅修', '静坐', '正念', '冥想', '禅茶', '读书', '一对一指导']
    : [
        'Buddhism',
        'Buddhist study',
        'Zen',
        'Zen meditation',
        'meditation',
        'mindfulness',
        'sitting practice',
        'tea meditation',
        'reading',
        'one-on-one guidance',
      ]
}

function clean(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const value = clean(raw)
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function truncateDescription(text: string, locale: Locale): string {
  const max = locale === 'zh-CN' ? 150 : 170
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).replace(/[\s,，。.;；:：-]+$/, '')}…`
}
