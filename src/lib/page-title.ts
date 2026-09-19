import type { Locale } from './i18n'

/**
 * Join `<title>` parts with the house separator: full-width "｜" in Chinese,
 * " | " in English. Never an em-dash. Empty parts are skipped.
 */
export function pageTitle(locale: Locale, ...parts: (string | null | undefined)[]): string {
  const clean = parts.map((p) => (p ?? '').trim()).filter(Boolean)
  return clean.join(locale === 'zh-CN' ? '｜' : ' | ')
}

/**
 * Split a CMS place name like "Shanming Mindful Peace Yard · Bac Ninh, Vietnam" into
 * the name proper and its locality. Names without " · " stay whole.
 */
export function splitPlaceName(name: string): { primary: string; secondary: string | null } {
  const idx = name.indexOf(' · ')
  if (idx <= 0) return { primary: name.trim(), secondary: null }
  const primary = name.slice(0, idx).trim()
  const secondary = name.slice(idx + 3).trim()
  return { primary: primary || name.trim(), secondary: secondary || null }
}

/** "Bac Ninh, Vietnam" + "Vietnam" → no repeat. */
export function withCountry(city: string, country: string): string {
  if (!city) return country
  return city.toLowerCase().includes(country.toLowerCase()) ? city : `${city} · ${country}`
}
