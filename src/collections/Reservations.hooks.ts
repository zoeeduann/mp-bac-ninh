/**
 * Standalone hook functions for the Reservations collection.
 * Extracted here so they can be unit-tested without importing the full
 * Payload config object.
 */
import { enqueueEmail } from '../lib/email-jobs'
import { buildIcs } from '../lib/ics'
import {
  bookingCalendarUid,
  bookingTimeLabel,
  calendarFilename,
  formatBookingDate,
  resolveBookingLocation,
} from '../lib/booking-context'

/**
 * Auto-fill audit timestamps when status is set:
 * - confirmed → set confirmedAt + confirmedBy
 * - deleted   → set deletedAt  + deletedBy
 * Fires on both create and update so direct admin-UI creates are audited.
 *
 * Also auto-derives location from activity.location when activity is set
 * but location is missing (spec §6.1 — "活动预约时从 activity.location 自动派生并写入").
 */
export async function reservationsBeforeChange({
  data,
  originalDoc,
  req,
  operation,
}: {
  data: unknown
  originalDoc?: Record<string, any> | null
  req: any
  operation: string
}): Promise<unknown> {
  // ── Location derivation ──────────────────────────────────────────────────
  // Always re-derive location from activity (activity is the source of truth for location).
  // If the reservation has no activity (general inquiry), location must be provided
  // externally (set by the route handler or admin creating the reservation).
  const activityId = (data as any).activity ?? (originalDoc as any)?.activity
  if (activityId) {
    try {
      const actualActivityId =
        typeof activityId === 'object' && activityId?.id
          ? activityId.id
          : activityId
      if (typeof actualActivityId === 'string' || typeof actualActivityId === 'number') {
        const activity = await req.payload.findByID({
          collection: 'activities',
          id: actualActivityId,
          depth: 0,
          overrideAccess: true,
        })
        if (activity?.location) {
          const derivedLocation =
            typeof activity.location === 'object' && activity.location?.id
              ? activity.location.id
              : activity.location
          ;(data as any).location = derivedLocation
        }
      }
    } catch {
      // Soft-fail: schema validation will reject the reservation if location ends up missing
    }
  }

  // ── Audit timestamps ─────────────────────────────────────────────────────
  const incomingStatus = (data as any).status

  if (operation === 'create') {
    if (incomingStatus === 'confirmed') {
      ;(data as any).confirmedAt = new Date().toISOString()
      ;(data as any).confirmedBy = req.user?.id
    }
    if (incomingStatus === 'deleted') {
      ;(data as any).deletedAt = new Date().toISOString()
      ;(data as any).deletedBy = req.user?.id
    }
    return data
  }

  // operation === 'update'
  if (incomingStatus !== originalDoc?.status) {
    if (incomingStatus === 'confirmed' && !originalDoc?.confirmedAt) {
      ;(data as any).confirmedAt = new Date().toISOString()
      ;(data as any).confirmedBy = req.user?.id
    }
    if (incomingStatus === 'deleted') {
      ;(data as any).deletedAt = new Date().toISOString()
      ;(data as any).deletedBy = req.user?.id
    }
  }
  return data
}

/**
 * afterChange hook: when status transitions to 'confirmed', send a confirmation
 * email to the guest (if they provided an email address).
 *
 * Uses fire-and-forget enqueueEmail so the admin UI save does not block on email.
 */
export async function reservationsAfterChange({
  doc,
  previousDoc,
  req,
}: {
  doc: Record<string, any>
  previousDoc?: Record<string, any> | null
  req: any
}): Promise<void> {
  if (
    doc.status === 'confirmed' &&
    previousDoc?.status !== 'confirmed' &&
    doc.email
  ) {
    const isZh = doc.language !== 'en'

    // Resolve the academy once — used for sender name, Reply-To, session
    // time zone and the .ics location below.
    const resolvedLocation = await resolveBookingLocation(
      req.payload,
      doc.location,
      isZh ? 'zh-CN' : 'en',
    )

    // Build .ics attachment if this is an activity reservation (not a general inquiry)
    let icsAttachments: Array<{ filename: string; content: string; contentType: string }> | undefined
    let confirmedTime: string | undefined

    if (doc.activity && doc.occurrenceId) {
      try {
        const activityId =
          typeof doc.activity === 'object' && doc.activity?.id ? doc.activity.id : doc.activity
        const activity = await req.payload.findByID({
          collection: 'activities',
          id: String(activityId),
          depth: 1,
          locale: isZh ? 'zh-CN' : 'en',
          overrideAccess: true,
        })

        const occurrence = (activity?.occurrences as any[])?.find(
          (o: any) => String(o.id) === String(doc.occurrenceId),
        )

        if (occurrence?.startAt && occurrence?.endAt) {
          confirmedTime = `${formatBookingDate(new Date(occurrence.startAt), isZh ? 'zh-CN' : 'en', resolvedLocation.timeZone)} (${bookingTimeLabel(resolvedLocation.timeZone, isZh ? 'zh-CN' : 'en')})`
          // Fetch settings for the organizer fallback
          let adminEmail: string | undefined
          try {
            const settings = await req.payload.findGlobal({
              slug: 'settings',
              overrideAccess: true,
            })
            adminEmail = (settings as any)?.adminEmail ?? undefined
          } catch {
            // Non-fatal
          }

          const calendarLocation = [resolvedLocation.brandName, resolvedLocation.address]
            .filter(Boolean)
            .join(', ')

          const descParts: string[] = []
          if (doc.name) descParts.push(isZh ? `预约人: ${doc.name}` : `Booking for: ${doc.name}`)
          if (doc.guests && doc.guests > 1) descParts.push(isZh ? `人数: ${doc.guests}` : `Guests: ${doc.guests}`)
          descParts.push(isZh ? `学堂: ${resolvedLocation.brandName}` : `Academy: ${resolvedLocation.brandName}`)
          if (doc.notes) descParts.push(isZh ? `备注: ${doc.notes}` : `Notes: ${doc.notes}`)

          const ics = buildIcs({
            uid: bookingCalendarUid(doc.id),
            startUtc: new Date(occurrence.startAt),
            endUtc: new Date(occurrence.endAt),
            summary: (activity.title as string) ?? (isZh ? '学堂活动' : 'Academy event'),
            description: descParts.join('\n'),
            locationName: calendarLocation,
            organizerEmail: resolvedLocation.email ?? adminEmail,
            productName: resolvedLocation.brandName,
            timeZone: resolvedLocation.timeZone,
          })

          icsAttachments = [
            {
              filename: calendarFilename(resolvedLocation.brandName),
              content: ics,
              contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
            },
          ]
        }
      } catch (err) {
        // Non-fatal: send email without .ics
        console.error('[Reservations.hooks] Failed to build .ics:', err)
      }
    }

    const emailBrand = resolvedLocation.brandName

    await enqueueEmail(req.payload, {
      to: doc.email,
      subject: isZh
        ? `${emailBrand} · 预约已确认`
        : `${emailBrand} · Booking confirmed`,
      body: isZh
        ? `你好 ${doc.name},\n\n你的预约已确认。${confirmedTime ? `\n时间：${confirmedTime}` : ''}\n期待相见。\n\n${emailBrand}`
        : `Hi ${doc.name},\n\nYour booking is confirmed.${confirmedTime ? `\nTime: ${confirmedTime}` : ''}\nWe look forward to seeing you.\n\n${emailBrand}`,
      // Per-academy from-name + reply-to so the recipient sees the right
      // academy as sender and replies route to that academy's mailbox.
      fromName: emailBrand,
      replyTo: resolvedLocation.email,
      relatedReservation: String(doc.id),
      ...(icsAttachments ? { attachments: icsAttachments } : {}),
    })
  }
}
