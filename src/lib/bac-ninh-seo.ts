import type { Locale } from './i18n'

export const BAC_NINH_SLUG = 'bac-ninh'

/**
 * Search copy for the Bac Ninh site. Titles lead with what Chinese speakers in
 * Bac Ninh search for (北宁 + 禅修 / 佛学); names follow Mindful Peace
 * International (静心小院 = Mindful Peace Yard, pinyin "Shanming").
 *
 * Each page type targets one intent: home = the place, activity list =
 * sessions to book, journal = what happened, sub-pages = practical details.
 */
export interface BacNinhPageSeo {
  homeTitle: string
  homeDescription: string
  activitiesTitle: string
  activitiesDescription: string
  activitiesHeading: string
  journalTitle: string
  journalDescription: string
  aboutTitle: string
  aboutDescription: string
  contactTitle: string
  contactDescription: string
  bookTitle: string
  bookDescription: string
}

const COPY: Record<Locale, BacNinhPageSeo> = {
  'zh-CN': {
    homeTitle: '北宁善明静心小院｜越南北宁的公益禅修与佛法修学',
    homeDescription:
      '北宁的一处安静修学空间。善明静心小院是国际静心协会在越南北宁的静心小院，提供正念禅修、安心禅茶、读书会、太极正念球与中医按导，纯公益、免费参加，欢迎预约。',
    activitiesTitle: '北宁禅修与禅茶活动日程·免费预约｜善明静心小院',
    activitiesDescription:
      '查看越南北宁善明静心小院近期的正念禅修、安心禅茶、读书会、太极正念球与中医按导活动。纯公益，免费参加，在线预约场次。',
    activitiesHeading: '北宁禅修与正念活动',
    journalTitle: '北宁禅修与正念活动记录｜善明静心小院',
    journalDescription:
      '越南北宁善明静心小院的学堂笔记：安心禅茶、读书会、正念禅修与日常修学的现场记录。',
    aboutTitle: '关于越南北宁善明静心小院',
    aboutDescription:
      '了解越南北宁善明静心小院：小院缘起、修学空间与到访方式。善明静心小院隶属国际静心协会，采用济群法师创建的静心学堂课程体系。',
    contactTitle: '联系越南北宁善明静心小院',
    contactDescription:
      '联系越南北宁善明静心小院：Facebook 与到访地址。活动纯公益、免费参加，到访前请先预约。',
    bookTitle: '预约北宁禅修与禅茶活动｜善明静心小院',
    bookDescription:
      '预约越南北宁善明静心小院的正念禅修、安心禅茶、读书会等活动，或留言咨询。纯公益，免费参加。',
  },
  en: {
    homeTitle: 'Shanming Mindful Peace Yard | Meditation in Bac Ninh, Vietnam',
    homeDescription:
      'Shanming Mindful Peace Yard is the Bac Ninh space of Mindful Peace International, offering free meditation, Dhyana Tea, reading circles, Tai Chi mindfulness ball and wellbeing practice. Sessions are mostly in Chinese; please book ahead.',
    activitiesTitle: 'Meditation & Dhyana Tea Sessions in Bac Ninh | Shanming Mindful Peace Yard',
    activitiesDescription:
      'Upcoming free meditation, Dhyana Tea, reading circles, Tai Chi mindfulness ball and wellbeing sessions at Shanming Mindful Peace Yard in Bac Ninh. Book a session online.',
    activitiesHeading: 'Meditation & Mindfulness in Bac Ninh',
    journalTitle: 'Journal – Bac Ninh | Shanming Mindful Peace Yard',
    journalDescription:
      'Journal entries from Shanming Mindful Peace Yard in Bac Ninh: Dhyana Tea, reading circles, meditation and everyday practice.',
    aboutTitle: 'About Shanming Mindful Peace Yard, Bac Ninh',
    aboutDescription:
      'About Shanming Mindful Peace Yard in Bac Ninh: its story, the space, and how to visit. Part of Mindful Peace International; all sessions are free.',
    contactTitle: 'Contact Shanming Mindful Peace Yard, Bac Ninh',
    contactDescription:
      'Contact Shanming Mindful Peace Yard in Bac Ninh via Facebook, and find the address. All sessions are free; please book before you visit.',
    bookTitle: 'Book a Session in Bac Ninh | Shanming Mindful Peace Yard',
    bookDescription:
      'Book a free meditation, Dhyana Tea or reading session at Shanming Mindful Peace Yard in Bac Ninh, or leave an inquiry.',
  },
}

/** Bac Ninh page copy, or null for any other location (generic copy applies). */
export function bacNinhSeo(slug: string | null | undefined, locale: Locale): BacNinhPageSeo | null {
  return slug === BAC_NINH_SLUG ? COPY[locale] : null
}

/** Activity / journal <title> with the place and search intent after the name. */
export function bacNinhDetailTitle(
  locale: Locale,
  kind: 'activity' | 'journal',
  title: string,
): string {
  if (locale === 'zh-CN') {
    return `${title}｜${kind === 'activity' ? '北宁禅修与正念活动' : '北宁禅修与正念活动记录'}｜善明静心小院`
  }
  return `${title} – Bac Ninh | Shanming Mindful Peace Yard`
}

/**
 * Other names the yard is known by, including the pre-2026-09 ones, so search
 * engines tie older mentions to the same place (JSON-LD alternateName).
 */
export const BAC_NINH_ALTERNATE_NAMES = [
  '越南北宁善明静心小院',
  '北宁善明静心小院',
  '善明静心小院',
  '越南善明静心小院',
  '越南北宁善明小院',
  '善明小院',
  'Shanming Mindful Peace Yard',
  'Mindful Peace Yard Bac Ninh',
  'Thien Minh Courtyard',
  'Thiện Minh Tiểu Viện',
]

/** Structured address for LocalBusiness JSON-LD (the site has a Plus Code, no street number). */
export const BAC_NINH_POSTAL_ADDRESS = {
  streetAddress: '4262+VGR, Đại Đồng',
  addressLocality: 'Đại Đồng',
  addressRegion: 'Bắc Ninh',
  addressCountry: 'VN',
} as const
