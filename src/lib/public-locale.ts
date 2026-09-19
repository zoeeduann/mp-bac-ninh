import type { Locale } from './i18n'

/** Avoid leaking Chinese localized fields into public English pages. */
export function publicFallbackLocale(locale: Locale): 'zh-CN' | false {
  return locale === 'en' ? false : 'zh-CN'
}

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u

export function hasCjkText(value: unknown): boolean {
  return typeof value === 'string' && CJK_RE.test(value)
}

/** A localized title must exist and, on English routes, must not fall back to CJK copy. */
export function hasUsableLocalizedTitle(value: unknown, locale: Locale): value is string {
  return (
    typeof value === 'string' && value.trim().length > 0 && (locale !== 'en' || !hasCjkText(value))
  )
}

export function localizedDocsForLocale<T extends { title?: unknown }>(
  docs: T[],
  locale: Locale,
): T[] {
  if (locale !== 'en') return docs
  return docs.filter((doc) => hasUsableLocalizedTitle(doc.title, locale))
}
