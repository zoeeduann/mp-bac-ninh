/**
 * Converts a string to a URL-friendly slug.
 *
 * Handles:
 * - Latin characters: lowercased, diacritics stripped
 * - Chinese characters: kept as-is (Unicode range 一–龥)
 * - Other Unicode: collapsed to hyphens
 * - Leading/trailing hyphens stripped
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^\w一-龥]+/g, '-') // keep word chars and CJK; collapse rest to '-'
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}
