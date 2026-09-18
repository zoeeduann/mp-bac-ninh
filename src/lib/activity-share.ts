import type { Activity } from '@/payload-types'
import type { Locale } from './i18n'
import { activityImageUrl } from './activity-image'
import { SITE_BASE } from './site-config'

/** Cache key changes with either event copy or generated artwork. */
export function activityShareImageUrl(activity: Activity, locale: Locale, base = ''): string | undefined {
  if (!activityImageUrl(activity.heroImage, 'hero')) return undefined
  const source = typeof activity.heroImage === 'object' ? activity.heroImage : null
  const cover = source?.cardCover && typeof source.cardCover === 'object' ? source.cardCover : null
  const version = `${activity.updatedAt || ''}_${cover?.updatedAt || ''}_${cover?.filename || ''}`
  return `${base}/api/activities/${activity.id}/share-image?${new URLSearchParams({ locale, v: version })}`
}

/** The academy's CMS name, else the Bac Ninh brand. */
export function shareBrandName(locationName: string | null | undefined, locale: Locale): string {
  return locationName?.trim() || (locale === 'en' ? 'Mindful Peace Yard Bac Ninh' : '越南北宁善明小院')
}

/** Bare public host, e.g. mindfulpeacebacninh.com. */
export function shareDomain(base = SITE_BASE): string {
  try {
    return new URL(base).host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * The bundled CJK share font has no precomposed Vietnamese letters (ắ, ạ, ở…),
 * which would render as blank boxes. Fold only Latin letters with diacritics
 * to their base letter; CJK text and đ/Đ (which the font covers) are unchanged.
 */
export function shareSafeText(value: string): string {
  return value.replace(/[À-ɏḀ-ỿ]/g, (char) =>
    char.normalize('NFD').replace(/[̀-ͯ]/g, '') || char,
  )
}
