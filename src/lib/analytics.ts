export type AnalyticsParameter = string | number | boolean
export type AnalyticsParameters = Record<string, AnalyticsParameter | undefined>

type Gtag = (
  command: 'event',
  eventName: string,
  parameters?: Record<string, AnalyticsParameter>,
) => void

function browserGtag(): Gtag | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as typeof window & { gtag?: Gtag }).gtag
}

/**
 * Send a GA4 event through the Google tag already installed in the frontend
 * layout. Undefined values are removed so optional CMS fields never become
 * the literal string "undefined" in Analytics.
 */
export function trackEvent(eventName: string, parameters: AnalyticsParameters = {}): void {
  const gtag = browserGtag()
  if (!gtag) return

  const cleanParameters = Object.fromEntries(
    Object.entries(parameters).filter((entry): entry is [string, AnalyticsParameter] => (
      entry[1] !== undefined
    )),
  )

  gtag('event', eventName, cleanParameters)
}

interface BookingEventContext {
  bookingSource: 'activity_detail' | 'book_list' | 'shared_link'
  locationSlug: string
  activitySlug: string
  language: 'zh-CN' | 'en'
}

export function trackBookingStart(context: BookingEventContext): void {
  trackEvent('booking_start', {
    booking_source: context.bookingSource,
    location_slug: context.locationSlug,
    activity_slug: context.activitySlug,
    language: context.language,
  })
}

export function trackActivityLead(
  context: BookingEventContext & { waitlisted: boolean },
): void {
  trackEvent('generate_lead', {
    lead_type: 'activity_booking',
    booking_source: context.bookingSource,
    location_slug: context.locationSlug,
    activity_slug: context.activitySlug,
    language: context.language,
    waitlist_status: context.waitlisted ? 'waitlisted' : 'requested',
  })
}

export function trackInquiryLead(input: {
  locationSlug?: string
  language: 'zh-CN' | 'en'
}): void {
  trackEvent('generate_lead', {
    lead_type: 'general_inquiry',
    booking_source: 'book_general_inquiry',
    location_slug: input.locationSlug,
    language: input.language,
  })
}

export function trackContactClick(contactMethod: string): void {
  trackEvent('contact_click', { contact_method: contactMethod })
}

export function trackWechatCopy(): void {
  trackEvent('wechat_copy', { contact_method: 'wechat' })
}

export function trackMapOpen(locationSlug: string): void {
  trackEvent('map_open', { location_slug: locationSlug })
}
