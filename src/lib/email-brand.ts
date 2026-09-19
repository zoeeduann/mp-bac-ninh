/** Prefer the academy's CMS name; use the deployment brand if it is unavailable. */
export function emailBrandName(
  locationName?: string | null,
  language: 'zh' | 'en' = 'zh',
): string {
  const name = locationName?.trim()
  if (name) return name

  if (process.env.NEXT_PUBLIC_SITE_LOCATION_SLUG?.trim() === 'bac-ninh') {
    return language === 'en' ? 'Shanming Mindful Peace Yard' : '越南北宁善明静心小院'
  }

  return language === 'en' ? 'Mindfulpeace Academy Thailand' : '静心学堂 · 泰国'
}
