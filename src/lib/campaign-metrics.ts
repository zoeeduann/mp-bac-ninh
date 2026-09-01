import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import {
  campaignMetricKey,
  normalizeCampaignMetric,
  vietnamMetricDate,
  type CampaignMetricInput,
} from './campaign-metric-dimensions'

export * from './campaign-metric-dimensions'

/** Atomically increments one daily aggregate. No per-visitor row is created. */
export async function recordCampaignMetric(
  payload: Payload,
  unsafeInput: CampaignMetricInput,
): Promise<void> {
  const input = normalizeCampaignMetric(unsafeInput)
  const metricDate = vietnamMetricDate()
  const metricKey = campaignMetricKey(metricDate, input)
  const drizzle = (
    payload.db as unknown as { drizzle: { execute: (query: unknown) => Promise<unknown> } }
  ).drizzle

  const values = [
    metricKey,
    metricDate,
    input.focus,
    input.utmSource,
    input.utmMedium,
    input.utmCampaign,
    input.utmContent,
  ] as const

  if (input.event === 'page_view') {
    await drizzle.execute(sql`
      INSERT INTO "campaign_metrics"
        ("metric_key", "metric_date", "focus", "utm_source", "utm_medium", "utm_campaign", "utm_content", "page_views", "form_starts", "lead_successes", "updated_at", "created_at")
      VALUES (${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]}, ${values[5]}, ${values[6]}, 1, 0, 0, now(), now())
      ON CONFLICT ("metric_key") DO UPDATE
      SET "page_views" = "campaign_metrics"."page_views" + 1, "updated_at" = now()
    `)
    return
  }

  if (input.event === 'form_start') {
    await drizzle.execute(sql`
      INSERT INTO "campaign_metrics"
        ("metric_key", "metric_date", "focus", "utm_source", "utm_medium", "utm_campaign", "utm_content", "page_views", "form_starts", "lead_successes", "updated_at", "created_at")
      VALUES (${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]}, ${values[5]}, ${values[6]}, 0, 1, 0, now(), now())
      ON CONFLICT ("metric_key") DO UPDATE
      SET "form_starts" = "campaign_metrics"."form_starts" + 1, "updated_at" = now()
    `)
    return
  }

  await drizzle.execute(sql`
    INSERT INTO "campaign_metrics"
      ("metric_key", "metric_date", "focus", "utm_source", "utm_medium", "utm_campaign", "utm_content", "page_views", "form_starts", "lead_successes", "updated_at", "created_at")
    VALUES (${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]}, ${values[5]}, ${values[6]}, 0, 0, 1, now(), now())
    ON CONFLICT ("metric_key") DO UPDATE
    SET "lead_successes" = "campaign_metrics"."lead_successes" + 1, "updated_at" = now()
  `)
}
