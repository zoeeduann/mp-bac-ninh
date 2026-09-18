import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '../../../../payload.config'
import { enqueueEmail } from '../../../../lib/email-jobs'
import {
  bookingTimeLabel,
  formatBookingDate,
  resolveBookingLocation,
} from '../../../../lib/booking-context'

// Cron iterates over confirmed reservations and sends per-attendee
// reminder emails — could be many SMTP calls in one invocation.
export const maxDuration = 60

/**
 * GET /api/cron/reminders
 *
 * Sends 24-hour reminder emails for upcoming confirmed activity reservations.
 * Runs on a schedule (see vercel.json). Safe to call idempotently — the
 * reminderSentAt field prevents double-sends.
 *
 * Auth: if CRON_SECRET env var is set, requires Authorization: Bearer {secret}.
 * If not set (local dev), allows unauthenticated calls.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const payload = await getPayload({ config: configPromise })
    const p = payload as any

    const now = new Date()
    // Window: 22h → 26h from now (slight overlap to catch late/early cron fires)
    const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000)
    const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000)

    // Find confirmed reservations for activities within the window that
    // haven't had a reminder sent yet.
    const result = await p.find({
      collection: 'reservations',
      where: {
        and: [
          { status: { equals: 'confirmed' } },
          { email: { exists: true } },
          { email: { not_equals: '' } },
          { reminderSentAt: { exists: false } },
          { activity: { exists: true } },
          { occurrenceId: { exists: true } },
        ],
      },
      limit: 200,
      overrideAccess: true,
    })

    const reservations: any[] = result.docs ?? []

    let sent = 0

    for (const res of reservations) {
      if (!res.email) continue

      // Fetch the activity to find the occurrence's startAt
      try {
        const activityId =
          typeof res.activity === 'object' && res.activity?.id ? res.activity.id : res.activity
        const activity = await p.findByID({
          collection: 'activities',
          id: String(activityId),
          depth: 1,
          overrideAccess: true,
        })

        const occurrence = (activity?.occurrences as any[])?.find(
          (o: any) => String(o.id) === String(res.occurrenceId),
        )

        if (!occurrence?.startAt) continue

        const startAt = new Date(occurrence.startAt)
        // Skip if outside our send window
        if (startAt < windowStart || startAt > windowEnd) continue

        const isZh = res.language !== 'en'

        const location = await resolveBookingLocation(
          p,
          res.location ?? activity?.location,
          isZh ? 'zh-CN' : 'en',
        )
        const dateStr = formatBookingDate(startAt, isZh ? 'zh-CN' : 'en', location.timeZone)
        const signOff = location.brandName
        const timeLabel = bookingTimeLabel(location.timeZone, isZh ? 'zh-CN' : 'en')
        const body = isZh
          ? `你好 ${res.name},\n\n提醒你明天的活动：\n\n活动：${activity.title ?? '学堂活动'}\n时间：${dateStr} (${timeLabel})\n地点：${location.brandName}\n\n${res.notes ? `备注：${res.notes}\n\n` : ''}期待明日相见。\n\n${signOff}`
          : `Hi ${res.name},\n\nA reminder for your activity tomorrow:\n\nActivity: ${activity.title ?? 'Academy event'}\nTime: ${dateStr} (${timeLabel})\nVenue: ${location.brandName}\n\n${res.notes ? `Notes: ${res.notes}\n\n` : ''}We look forward to seeing you.\n\n${signOff}`

        await enqueueEmail(payload, {
          to: res.email,
          subject: isZh
            ? `明日相见 · ${signOff}`
            : `Tomorrow at ${signOff}`,
          body,
          fromName: signOff,
          replyTo: location.email,
          relatedReservation: String(res.id),
        })

        // Mark reminderSentAt
        await p.update({
          collection: 'reservations',
          id: res.id,
          data: { reminderSentAt: new Date().toISOString() },
          overrideAccess: true,
        })

        sent++
      } catch (err) {
        console.error(`[cron/reminders] Error processing reservation ${res.id}:`, err)
        // Continue to next reservation
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (err) {
    console.error('[cron/reminders] Fatal error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
