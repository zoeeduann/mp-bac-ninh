import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  trackActivityLead,
  trackBookingStart,
  trackContactClick,
  trackEvent,
  trackInquiryLead,
  trackMapOpen,
  trackWechatCopy,
} from '@/lib/analytics'

describe('GA4 analytics events', () => {
  let gtag: ReturnType<typeof vi.fn>

  beforeEach(() => {
    gtag = vi.fn()
    ;(window as typeof window & { gtag: typeof gtag }).gtag = gtag
  })

  it('sends an event and removes undefined parameters', () => {
    trackEvent('example_event', { present: 'yes', missing: undefined })

    expect(gtag).toHaveBeenCalledWith('event', 'example_event', { present: 'yes' })
  })

  it('tracks a booking start with public booking context only', () => {
    trackBookingStart({
      bookingSource: 'activity_detail',
      locationSlug: 'bac-ninh',
      activitySlug: 'tea-meditation',
      language: 'zh-CN',
    })

    expect(gtag).toHaveBeenCalledWith('event', 'booking_start', {
      booking_source: 'activity_detail',
      location_slug: 'bac-ninh',
      activity_slug: 'tea-meditation',
      language: 'zh-CN',
    })
  })

  it('uses the recommended generate_lead event after an activity booking', () => {
    trackActivityLead({
      bookingSource: 'shared_link',
      locationSlug: 'bac-ninh',
      activitySlug: 'sitting-practice',
      language: 'en',
      waitlisted: true,
    })

    expect(gtag).toHaveBeenCalledWith('event', 'generate_lead', {
      lead_type: 'activity_booking',
      booking_source: 'shared_link',
      location_slug: 'bac-ninh',
      activity_slug: 'sitting-practice',
      language: 'en',
      waitlist_status: 'waitlisted',
    })
  })

  it('tracks a general inquiry as a lead without personal form data', () => {
    trackInquiryLead({ locationSlug: 'bac-ninh', language: 'zh-CN' })

    expect(gtag).toHaveBeenCalledWith('event', 'generate_lead', {
      lead_type: 'general_inquiry',
      booking_source: 'book_general_inquiry',
      location_slug: 'bac-ninh',
      language: 'zh-CN',
    })
  })

  it('tracks contact micro-conversions', () => {
    trackContactClick('phone')
    trackWechatCopy()
    trackMapOpen('bac-ninh')

    expect(gtag).toHaveBeenNthCalledWith(1, 'event', 'contact_click', {
      contact_method: 'phone',
    })
    expect(gtag).toHaveBeenNthCalledWith(2, 'event', 'wechat_copy', {
      contact_method: 'wechat',
    })
    expect(gtag).toHaveBeenNthCalledWith(3, 'event', 'map_open', {
      location_slug: 'bac-ninh',
    })
  })
})
