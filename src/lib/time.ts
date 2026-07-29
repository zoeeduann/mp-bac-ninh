import { format as formatTz, fromZonedTime, toZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Bangkok'

export function formatICT(date: Date): string {
  return formatTz(toZonedTime(date, TZ), 'HH:mm', { timeZone: TZ })
}

export function toUtcISO(localISO: string, tz: string = TZ): string {
  return fromZonedTime(localISO, tz).toISOString()
}

export function formatDateLong(date: Date, locale: 'zh-CN' | 'en'): string {
  const zoned = toZonedTime(date, TZ)
  if (locale === 'zh-CN') {
    return formatTz(zoned, 'yyyy年M月d日 HH:mm', { timeZone: TZ }) + ' ICT'
  }
  return formatTz(zoned, "MMM d, yyyy 'at' HH:mm", { timeZone: TZ }) + ' ICT'
}

/**
 * Compact form used in activity date eyebrows.
 * zh-CN: "5月 26日 · 09:00 ICT"
 * en:    "MAY 26 · 09:00 ICT"
 */
export function formatDateCompact(date: Date, locale: 'zh-CN' | 'en'): string {
  const zoned = toZonedTime(date, TZ)
  if (locale === 'zh-CN') {
    return formatTz(zoned, 'M月 d日 · HH:mm', { timeZone: TZ }) + ' ICT'
  }
  return formatTz(zoned, 'MMM d · HH:mm', { timeZone: TZ }).toUpperCase() + ' ICT'
}
