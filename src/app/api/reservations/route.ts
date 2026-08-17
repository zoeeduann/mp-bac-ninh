import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'
import configPromise from '../../../payload.config'
import { verifyTurnstile } from '../../../lib/turnstile'
import { rateLimit } from '../../../lib/rate-limit'
import { computeOccupancy, canBook } from '../../../lib/capacity'
import { enqueueEmail } from '../../../lib/email-jobs'
import { isAllowedSameOriginRequest } from '../../../lib/request-origin'
import { TURNSTILE_ENABLED } from '../../../lib/site-config'

// Synchronous SMTP to Gmail can take 2-3 s per email; with the admin +
// user notifications + DB writes + advisory lock work, the default 10 s
// Vercel Hobby limit is too tight. 30 s gives comfortable headroom.
export const maxDuration = 30

// ── Zod schema ────────────────────────────────────────────────────────────────

const Body = z.object({
  source: z
    .enum([
      'home_cta',
      'nav_book',
      'book_list',
      'book_general_inquiry',
      'activity_detail',
      'shared_link',
    ])
    .default('activity_detail'),
  // Payload postgres adapter uses numeric IDs; accept string or number and coerce to string
  // (the `as any` cast in payload.create handles the type mismatch at the DB layer)
  activity: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
  occurrenceId: z.string().optional(),
  location: z.union([z.string(), z.number()]).transform(v => String(v)).optional(), // required for general inquiry, auto-derived for activity booking
  name: z.string().min(1).max(120),
  email: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().email().optional(),
  ),
  wechatId: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().max(80).optional(),
  ),
  zaloId: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().max(80).optional(),
  ),
  phone: z.string().min(3).max(40).regex(/^[+\d][\d\s\-()+]{2,}$/, 'invalid_phone'),
  guests: z.number().int().min(1).max(10).default(1),
  direction: z
    .enum(['meditation', 'mindfulness', 'one_on_one', 'visit', 'other'])
    .optional(),
  notes: z.string().max(2000).optional(),
  language: z.enum(['zh', 'en']).default('zh'),
  turnstileToken: z.string(),
  honeypot: z.string().optional(), // must be empty
  acceptWaitlist: z.boolean().default(false),
  fullSeriesConfirmed: z.boolean().default(false),
  chineseProficiency: z
    .enum([
      'understands_and_speaks',
      'understands_speaking_difficult',
      'translation_needed',
    ])
    .optional(),
}).refine(d => d.email || d.wechatId || d.zaloId, { message: 'contact_required' })

type ParsedBody = z.infer<typeof Body>

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

  // 1. Parse + validate body
  let body: ParsedBody
  try {
    body = Body.parse(await req.json())
  } catch (e) {
    console.warn('[reservations] Body parse failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  // 2. Honeypot check (must be empty or absent) — cheap, before rate-limit
  if (body.honeypot) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  // 3. Bac Ninh does not load Turnstile because its challenge host is not
  //    consistently reachable from mainland China. Require browser requests
  //    to originate from this deployment instead.
  if (
    !TURNSTILE_ENABLED &&
    !isAllowedSameOriginRequest({
      requestUrl: req.url,
      origin: req.headers.get('origin'),
      isProduction: process.env.NODE_ENV === 'production',
    })
  ) {
    return NextResponse.json({ error: 'cross_origin_forbidden' }, { status: 403 })
  }

  // 4. Use a stricter limit when CAPTCHA protection is disabled.
  //    Runs AFTER honeypot so bots don't consume legit users' budget.
  //    Still BEFORE Turnstile (network call) since rate-limit is cheap.
  const rl = TURNSTILE_ENABLED
    ? rateLimit(ip, 20, 5 * 60_000)
    : rateLimit(ip, 5, 10 * 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  // 5. Verify Turnstile only on deployments where it is enabled.
  if (TURNSTILE_ENABLED && !(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: 'turnstile_failed' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  // 6. General inquiry path (no activity)
  if (!body.activity) {
    if (!body.location) {
      return NextResponse.json({ error: 'location_required_for_inquiry' }, { status: 400 })
    }
    const locationId = toRelationId(body.location)
    const r = await payload.create({
      collection: 'reservations',
      data: {
        ...stripInternalFields(body),
        location: locationId,
        status: 'pending',
        emailStatus: body.email ? 'pending' : 'no_email',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      context: { internal: true },
    })
    await sendNotifications(payload, String(r.id), body, null)
    return NextResponse.json({ ok: true, id: r.id, kind: 'created' })
  }

  // 7. Activity booking path
  if (!body.occurrenceId) {
    return NextResponse.json({ error: 'occurrence_required' }, { status: 400 })
  }

  // Fetch activity (overrideAccess to allow unauthenticated reads of published activities)
  const activityNumId = toRelationId(body.activity)!
  const activity = await payload.findByID({
    collection: 'activities',
    id: activityNumId,
    depth: 0,
    overrideAccess: true,
  })
  if (!activity) {
    return NextResponse.json({ error: 'activity_not_found' }, { status: 404 })
  }
  if ((activity as any).status !== 'published') {
    return NextResponse.json({ error: 'activity_not_published' }, { status: 400 })
  }

  const isSeries = (activity as any).registrationMode === 'series'
  if (isSeries && !body.fullSeriesConfirmed) {
    return NextResponse.json(
      { error: 'full_series_confirmation_required' },
      { status: 400 },
    )
  }
  if ((activity as any).requiresChineseProficiency && !body.chineseProficiency) {
    return NextResponse.json(
      { error: 'chinese_proficiency_required' },
      { status: 400 },
    )
  }

  const occurrences: any[] = (activity as any).occurrences ?? []
  const occ = occurrences.find((o: any) => o.id === body.occurrenceId)
  if (!occ || occ.status === 'deleted' || occ.status === 'cancelled') {
    return NextResponse.json({ error: 'occurrence_invalid' }, { status: 400 })
  }

  if (isSeries) {
    const seriesAnchor = occurrences
      .filter((o: any) => o.startAt && o.status !== 'deleted' && o.status !== 'cancelled')
      .sort(
        (a: any, b: any) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      )[0]
    if (!seriesAnchor || String(seriesAnchor.id) !== String(body.occurrenceId)) {
      return NextResponse.json({ error: 'series_anchor_required' }, { status: 400 })
    }
  }

  // Acquire Postgres advisory lock to serialize bookings for this occurrence
  const lockKey = await hashToBigInt(`${body.activity}:${body.occurrenceId}`)
  const drizzle = (payload.db as any).drizzle

  await drizzle.execute(`SELECT pg_advisory_lock(${lockKey}::bigint)`)
  try {
    // a. Find existing reservations for this occurrence
    const existing = await payload.find({
      collection: 'reservations',
      where: {
        and: [
          { activity: { equals: activityNumId } },
          { occurrenceId: { equals: body.occurrenceId } },
          { status: { in: ['pending', 'confirmed'] } },
        ],
      },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })

    // b. Sum occupied guests
    const occupied = computeOccupancy(
      existing.docs.map((r: any) => ({
        status: r.status,
        guests: r.guests,
        occurrenceId: r.occurrenceId,
      })),
      body.occurrenceId!,
    )

    // c. Check capacity
    const verdict = canBook({
      capacity: (activity as any).capacity,
      override: occ.capacityOverride ?? null,
      occupied,
      guests: body.guests,
    })

    let result: { kind: 'created' | 'waitlisted' | 'full'; id?: string }

    if (verdict.ok) {
      // d. Capacity available — create pending reservation
      const created = await payload.create({
        collection: 'reservations',
        data: {
          ...stripInternalFields(body),
          activity: toRelationId(body.activity),
          status: 'pending',
          emailStatus: body.email ? 'pending' : 'no_email',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        context: { internal: true },
      })
      result = { kind: 'created', id: String(created.id) }
    } else if (body.acceptWaitlist) {
      // e. Full but waitlist accepted
      const created = await payload.create({
        collection: 'reservations',
        data: {
          ...stripInternalFields(body),
          activity: toRelationId(body.activity),
          status: 'waitlist',
          emailStatus: body.email ? 'pending' : 'no_email',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        context: { internal: true },
      })
      result = { kind: 'waitlisted', id: String(created.id) }
    } else {
      // f. Full, no waitlist
      result = { kind: 'full' }
    }

    if (result.kind === 'full') {
      return NextResponse.json({ error: 'capacity_full' }, { status: 409 })
    }

    // Wait for emails before responding — fire-and-forget gets killed
    // by Vercel terminating the lambda the moment we return.
    // Pass the full activity so sendNotifications can pull the occurrence's
    // startAt into the admin notification body + subject.
    await sendNotifications(payload, result.id!, body, (activity as any).title, activity)
    return NextResponse.json({ ok: true, id: result.id, kind: result.kind })
  } finally {
    // Always release the advisory lock
    try {
      await drizzle.execute(`SELECT pg_advisory_unlock(${lockKey}::bigint)`)
    } catch {
      // best-effort unlock
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a stable 63-bit signed bigint from SHA-256 of the input string */
async function hashToBigInt(input: string): Promise<bigint> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  const view = new DataView(buf)
  // Take top 8 bytes; AND with 0x7fffffff_ffffffff to keep positive (signed 63-bit range)
  return view.getBigUint64(0) & 0x7fffffffffffffffn
}

/** Strip fields that should not be written to the DB directly */
function stripInternalFields(body: ParsedBody) {
  const { turnstileToken: _t, honeypot: _h, acceptWaitlist: _w, ...rest } = body
  return rest
}

/**
 * Coerce a string or numeric ID to a number for Payload's postgres adapter.
 * Payload relationship fields use numeric PKs; JSON bodies may send strings.
 */
function toRelationId(id: string | number | undefined): number | undefined {
  if (id === undefined) return undefined
  const n = Number(id)
  return isNaN(n) ? undefined : n
}

/** Enqueue admin + user receipt emails (fire-and-forget, returns void immediately) */
async function sendNotifications(
  payload: any,
  reservationId: string,
  body: ParsedBody,
  activityTitle: any,
  activity?: any,
): Promise<void> {
  const isZh = body.language === 'zh'

  // ── Resolve which occurrence was booked, format its BKK wall-clock time ──
  // The reservation row only stores occurrenceId; without this lookup the
  // admin email shows no date/time. Format in Asia/Bangkok so the recipient
  // doesn't have to mentally convert UTC.
  let occurrenceLineLong: string | undefined
  let occurrenceLineShort: string | undefined
  if (activity && body.occurrenceId) {
    const occ = (activity.occurrences as any[] | undefined)?.find(
      (o: any) => String(o.id) === String(body.occurrenceId),
    )
    if (occ?.startAt) {
      const startDate = new Date(occ.startAt)
      if (!isNaN(startDate.getTime())) {
        // Long form for the email body. The location-specific time label is
        // appended after the academy record is resolved below.
        occurrenceLineLong = startDate.toLocaleString(isZh ? 'zh-CN' : 'en-US', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        // Short form for the subject line: "6/15 19:30"
        occurrenceLineShort = startDate.toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      }
    }
  }

  // 1. Fetch Settings independently — a missing/broken global must not kill the user receipt
  let adminEmail: string | undefined
  try {
    const settings = await payload.findGlobal({ slug: 'settings' })
    adminEmail = settings?.adminEmail
  } catch (err) {
    console.error('[reservations] Failed to read Settings global — admin email will be skipped:', err)
  }

  // 2. Fetch the booking's location for per-academy from-name + reply-to.
  //    body.location is guaranteed present (required by validation + auto-derived for activity bookings).
  let locationName: string | undefined
  let locationEmail: string | undefined
  let locationIsThailandNetwork = true
  try {
    const locId = body.location
    const locDoc = await payload.findByID({
      collection: 'locations',
      id: String(locId),
      depth: 0,
      locale: isZh ? 'zh-CN' : 'en',
      overrideAccess: true,
    })
    locationName = locDoc?.name ?? undefined
    locationEmail = locDoc?.email ?? undefined
    locationIsThailandNetwork = locDoc?.isThailandNetwork !== false
  } catch (err) {
    console.error('[reservations] Failed to look up location for email routing:', err)
  }

  if (occurrenceLineLong) {
    occurrenceLineLong += locationIsThailandNetwork
      ? (isZh ? ' (泰国时间)' : ' (Bangkok time)')
      : (isZh ? ' (当地时间)' : ' (local time)')
  }

  const isSeries = activity?.registrationMode === 'series'
  const seriesTimeSuffix = locationIsThailandNetwork
    ? (isZh ? ' (泰国时间)' : ' (Bangkok time)')
    : (isZh ? ' (当地时间)' : ' (local time)')
  const seriesOccurrenceLines = isSeries
    ? ((activity?.occurrences as any[] | undefined) ?? [])
        .filter((occ: any) => occ?.startAt && occ.status !== 'deleted' && occ.status !== 'cancelled')
        .sort(
          (a: any, b: any) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        )
        .map((occ: any, index: number) => {
          const start = new Date(occ.startAt)
          const formatted = start.toLocaleString(isZh ? 'zh-CN' : 'en-US', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
          return `${index + 1}. ${formatted}${seriesTimeSuffix}`
        })
    : []

  const chineseProficiencyLabel = body.chineseProficiency
    ? ({
        understands_and_speaks: '① 听得懂，也表达得清楚',
        understands_speaking_difficult: '② 能听懂，但表达困难',
        translation_needed: '③ 听和说都需要翻译才能够完成',
      } as const)[body.chineseProficiency]
    : undefined

  const activityTitleStr = activityTitle
    ? typeof activityTitle === 'string'
      ? activityTitle
      : (activityTitle['zh-CN'] ?? activityTitle.en ?? '活动')
    : ''

  const subjLine = activityTitle
    ? // Append the occurrence date so multiple bookings are distinguishable
      // at a glance in the inbox without opening the email.
      `预约通知: ${activityTitleStr}${occurrenceLineShort ? ` · ${occurrenceLineShort}` : ''}`
    : `自由咨询: ${body.name}`

  // 3. Admin notification — goes to BOTH the central admin mailbox AND
  //    the academy's own mailbox (locations.email). Deduped via Set so we
  //    don't double-send when they happen to be the same address. This way
  //    each academy's staff sees their own bookings without waiting for
  //    the central team to forward.
  const adminBody = [
    ...(activityTitleStr ? [`活动: ${activityTitleStr}`] : []),
    ...(isSeries
      ? [
          '报名类型: 系列课程（已确认全程参加）',
          ...(seriesOccurrenceLines.length > 0
            ? [`全部课次:\n${seriesOccurrenceLines.join('\n')}`]
            : []),
        ]
      : occurrenceLineLong
        ? [`场次: ${occurrenceLineLong}`]
        : []),
    `姓名: ${body.name}`,
    `电话: ${body.phone}`,
    `邮箱: ${body.email ?? '-'}`,
    `微信: ${body.wechatId ?? '-'}`,
    `Zalo: ${body.zaloId ?? '-'}`,
    ...(chineseProficiencyLabel ? [`中文听说水平: ${chineseProficiencyLabel}`] : []),
    `人数: ${body.guests}`,
    `备注: ${body.notes ?? '-'}`,
    ``,
    `请到后台查看: /admin/collections/reservations/${reservationId}`,
  ].join('\n')

  const adminRecipients = new Set<string>()
  if (adminEmail) adminRecipients.add(adminEmail)
  if (locationEmail) adminRecipients.add(locationEmail)

  for (const recipient of adminRecipients) {
    try {
      await enqueueEmail(payload, {
        to: recipient,
        subject: subjLine,
        body: adminBody,
        // Admin notification doesn't need per-academy fromName (the recipient
        // already knows which academy from the data) — keep network default.
        // Reply-To is the booker so staff can reply directly to them.
        replyTo: body.email,
        relatedReservation: reservationId,
      })
    } catch (err) {
      console.error(`[reservations] Failed to enqueue admin notification email to ${recipient}:`, err)
    }
  }

  // 4. User receipt — per-academy from-name + reply-to so replies route to the right academy
  if (body.email) {
    try {
      const signOff = locationName || (isZh ? '静心学堂 · 泰国' : 'Mindfulpeace Academy Thailand')
      await enqueueEmail(payload, {
        to: body.email,
        subject: isZh
          ? `${signOff} · 已收到你的预约`
          : `${signOff} · We received your reservation`,
        body: isZh
          ? `你好 ${body.name},\n\n我们已收到你的预约，会在 24 小时内通过邮件、微信或 Zalo 跟你确认。${activityTitleStr ? `\n\n活动：${activityTitleStr}` : ''}${isSeries && seriesOccurrenceLines.length > 0 ? `\n全部课次：\n${seriesOccurrenceLines.join('\n')}` : occurrenceLineLong ? `\n时间：${occurrenceLineLong}` : ''}\n\n${signOff}`
          : `Hi ${body.name},\n\nWe received your reservation and will confirm within 24 hours via email, WeChat, or Zalo.${activityTitleStr ? `\n\nActivity: ${activityTitleStr}` : ''}${isSeries && seriesOccurrenceLines.length > 0 ? `\nAll sessions:\n${seriesOccurrenceLines.join('\n')}` : occurrenceLineLong ? `\nTime: ${occurrenceLineLong}` : ''}\n\n${signOff}`,
        fromName: locationName,
        replyTo: locationEmail,
        relatedReservation: reservationId,
      })
    } catch (err) {
      console.error('[reservations] Failed to enqueue user receipt email:', err)
    }
  }
}
