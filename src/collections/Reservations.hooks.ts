/**
 * Standalone hook functions for the Reservations collection.
 * Extracted here so they can be unit-tested without importing the full
 * Payload config object.
 */
import { enqueueEmail } from '../lib/email-jobs'
import { buildIcs } from '../lib/ics'

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

    // Fetch the reservation's location once — used for both fromName/replyTo
    // (per-academy email routing) and .ics location field below.
    let resolvedLocation: { name?: string; email?: string } = {}
    if (doc.location) {
      try {
        const locId = typeof doc.location === 'object' && (doc.location as any)?.id
          ? (doc.location as any).id
          : doc.location
        const locDoc = await req.payload.findByID({
          collection: 'locations',
          id: String(locId),
          depth: 0,
          locale: isZh ? 'zh-CN' : 'en',
          overrideAccess: true,
        })
        resolvedLocation = {
          name: (locDoc as any)?.name ?? undefined,
          email: (locDoc as any)?.email ?? undefined,
        }
      } catch {
        // Non-fatal — falls back to defaults
      }
    }

    // Build .ics attachment if this is an activity reservation (not a general inquiry)
    let icsAttachments: Array<{ filename: string; content: string; contentType: string }> | undefined

    if (doc.activity && doc.occurrenceId) {
      try {
        const activityId =
          typeof doc.activity === 'object' && doc.activity?.id ? doc.activity.id : doc.activity
        const activity = await req.payload.findByID({
          collection: 'activities',
          id: String(activityId),
          depth: 1,
          overrideAccess: true,
        })

        const occurrence = (activity?.occurrences as any[])?.find(
          (o: any) => String(o.id) === String(doc.occurrenceId),
        )

        if (occurrence?.startAt && occurrence?.endAt) {
          // Fetch location for the location name
          let locationName: string | undefined
          try {
            const locationId =
              typeof activity.location === 'object' && (activity.location as any)?.id
                ? (activity.location as any).id
                : activity.location
            const locationDoc = await req.payload.findByID({
              collection: 'locations',
              id: String(locationId),
              depth: 0,
              overrideAccess: true,
            })
            locationName = (locationDoc as any)?.name ?? undefined
          } catch {
            // Non-fatal — locationName stays undefined
          }

          // Fetch settings for admin email
          let organizerEmail: string | undefined
          try {
            const settings = await req.payload.findGlobal({
              slug: 'settings',
              overrideAccess: true,
            })
            organizerEmail = (settings as any)?.adminEmail ?? undefined
          } catch {
            // Non-fatal
          }

          const descParts: string[] = []
          if (doc.name) descParts.push(isZh ? `预约人: ${doc.name}` : `Booking for: ${doc.name}`)
          if (doc.guests && doc.guests > 1) descParts.push(isZh ? `人数: ${doc.guests}` : `Guests: ${doc.guests}`)
          if (locationName) descParts.push(isZh ? `学堂: ${locationName}` : `Academy: ${locationName}`)
          if (doc.notes) descParts.push(isZh ? `备注: ${doc.notes}` : `Notes: ${doc.notes}`)

          const ics = buildIcs({
            uid: `r-${doc.id}@mindfulpeaceth.com`,
            startUtc: new Date(occurrence.startAt),
            endUtc: new Date(occurrence.endAt),
            summary: (activity.title as string) ?? (isZh ? '静心学堂活动' : 'Mindfulpeace Academy event'),
            description: descParts.join('\n'),
            locationName,
            organizerEmail,
          })

          icsAttachments = [
            {
              filename: 'mindfulpeace-booking.ics',
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

    const emailBrand =
      resolvedLocation.name ??
      (isZh ? '静心学堂 · 泰国' : 'Mindfulpeace Academy Thailand')

    await enqueueEmail(req.payload, {
      to: doc.email,
      subject: isZh
        ? `${emailBrand} · 预约已确认`
        : `${emailBrand} · Booking confirmed`,
      body: isZh
        ? `你好 ${doc.name},\n\n你的预约已确认。期待相见。\n\n${emailBrand}`
        : `Hi ${doc.name},\n\nYour booking is confirmed. We look forward to seeing you.\n\n${emailBrand}`,
      // Per-academy from-name + reply-to so the recipient sees the right
      // academy as sender and replies route to that academy's mailbox.
      fromName: resolvedLocation.name,
      replyTo: resolvedLocation.email,
      relatedReservation: String(doc.id),
      ...(icsAttachments ? { attachments: icsAttachments } : {}),
    })
  }
}
