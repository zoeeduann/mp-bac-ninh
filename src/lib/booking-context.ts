import { emailBrandName } from './email-brand'

/** Deployment default, used when an academy has no valid timeZone configured. */
export const DEFAULT_BOOKING_TIME_ZONE =
  process.env.NEXT_PUBLIC_SITE_LOCATION_SLUG?.trim() === 'bac-ninh'
    ? 'Asia/Ho_Chi_Minh'
    : 'Asia/Bangkok'

export interface BookingLocationContext {
  brandName: string
  email?: string
  timeZone: string
  address?: string
  mapEmbedUrl?: string
}

type BookingLocale = 'zh-CN' | 'en'

export function validTimeZone(value?: string | null): string {
  const candidate = value?.trim() || DEFAULT_BOOKING_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en', { timeZone: candidate }).format()
    return candidate
  } catch {
    return DEFAULT_BOOKING_TIME_ZONE
  }
}

/**
 * Load the booked academy once for every booking email: sender name,
 * Reply-To, calendar address and the time zone used to print session times.
 * Email delivery must continue even if the related location was removed.
 */
export async function resolveBookingLocation(
  payload: any,
  location: unknown,
  locale: BookingLocale,
): Promise<BookingLocationContext> {
  let doc: any
  const id = typeof location === 'object' && location !== null && 'id' in location
    ? (location as { id: unknown }).id
    : location

  if (id !== undefined && id !== null && id !== '') {
    try {
      doc = await payload.findByID({
        collection: 'locations',
        id: String(id),
        depth: 0,
        locale,
        overrideAccess: true,
      })
    } catch {
      // Fall back to the deployment brand and time zone below.
    }
  }

  return {
    brandName: emailBrandName(doc?.name, locale === 'zh-CN' ? 'zh' : 'en'),
    email: doc?.email?.trim() || undefined,
    timeZone: validTimeZone(doc?.timeZone),
    address: doc?.address?.trim() || undefined,
    mapEmbedUrl: doc?.mapEmbedUrl?.trim() || undefined,
  }
}

export function formatBookingDate(
  date: Date,
  locale: BookingLocale,
  timeZone: string,
  short = false,
): string {
  return date.toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    timeZone: validTimeZone(timeZone),
    year: short ? undefined : 'numeric',
    month: short ? 'numeric' : 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** "泰国时间" for Bangkok, a neutral "当地时间" everywhere else. */
export function bookingTimeLabel(timeZone: string, locale: BookingLocale): string {
  if (validTimeZone(timeZone) === 'Asia/Bangkok') {
    return locale === 'zh-CN' ? '泰国时间' : 'Bangkok time'
  }
  return locale === 'zh-CN' ? '当地时间' : 'local time'
}

/** Stable per-reservation UID, scoped to this deployment's own domain. */
export function bookingCalendarUid(reservationId: string | number): string {
  let domain = 'booking.local'
  try {
    domain = new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost').hostname.replace(/^www\./, '') || domain
  } catch {
    // Keep the neutral domain.
  }
  return `booking-${reservationId}@${domain}`
}

export function calendarFilename(brandName: string): string {
  const stem = brandName
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${stem || 'booking'}.ics`
}
