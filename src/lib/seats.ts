import type { Locale } from './i18n'

/** "剩余 6 个名额" / "6 spots left"; "已满" / "Full" when nothing remains. */
export function remainingSeatsText(locale: Locale, remaining: number): string {
  const n = Math.max(0, Math.floor(remaining))
  if (locale === 'zh-CN') return n > 0 ? `剩余 ${n} 个名额` : '已满'
  if (n === 0) return 'Full'
  return n === 1 ? '1 spot left' : `${n} spots left`
}
