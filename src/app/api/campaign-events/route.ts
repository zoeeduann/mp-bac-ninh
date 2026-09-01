import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { z } from 'zod'
import configPromise from '../../../payload.config'
import { recordCampaignMetric } from '../../../lib/campaign-metrics'
import { rateLimit } from '../../../lib/rate-limit'
import { isAllowedSameOriginRequest } from '../../../lib/request-origin'

const Attribution = z
  .object({
    utmSource: z.string().max(128).optional().default(''),
    utmMedium: z.string().max(128).optional().default(''),
    utmCampaign: z.string().max(128).optional().default(''),
    utmContent: z.string().max(128).optional().default(''),
  })
  .strict()

const Body = z
  .object({
    // Successful inquiries can only be counted by the reservation server after persistence.
    event: z.enum(['page_view', 'form_start']),
    focus: z.enum(['mindfulness', 'buddhism']),
    attribution: Attribution.optional().default({}),
  })
  .strict()

export async function POST(req: NextRequest) {
  if (
    !isAllowedSameOriginRequest({
      requestUrl: req.url,
      origin: req.headers.get('origin'),
      isProduction: process.env.NODE_ENV === 'production',
    })
  ) {
    return NextResponse.json({ error: 'cross_origin_forbidden' }, { status: 403 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (!rateLimit(`campaign-metric:${ip}`, 30, 60_000).ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config: configPromise })
    await recordCampaignMetric(payload, {
      event: parsed.data.event,
      focus: parsed.data.focus,
      ...parsed.data.attribution,
    })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[campaign-metrics] Failed to record anonymous event:', error)
    return NextResponse.json({ error: 'metric_unavailable' }, { status: 503 })
  }
}
