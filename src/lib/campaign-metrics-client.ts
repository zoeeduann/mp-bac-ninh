'use client'

import type { CampaignFocus } from './campaigns'
import {
  campaignAttributionFromSearch,
  type CampaignMetricEvent,
} from './campaign-metric-dimensions'

/** Best-effort anonymous aggregate event. It never blocks or changes the form. */
export function sendCampaignMetric(
  event: Exclude<CampaignMetricEvent, 'lead_success'>,
  focus: CampaignFocus,
): void {
  if (typeof window === 'undefined') return
  const attribution = campaignAttributionFromSearch(window.location.search)
  void fetch('/api/campaign-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({ event, focus, attribution }),
  }).catch(() => undefined)
}
