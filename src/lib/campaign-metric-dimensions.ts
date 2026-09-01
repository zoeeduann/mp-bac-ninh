import type { CampaignFocus } from './campaigns'

export type CampaignMetricEvent = 'page_view' | 'form_start' | 'lead_success'

export interface CampaignAttribution {
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
}

export interface CampaignMetricInput extends CampaignAttribution {
  event: CampaignMetricEvent
  focus: CampaignFocus
}

const EMPTY_ATTRIBUTION: CampaignAttribution = {
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
}

/** Keep only short campaign labels. Never copy a full query string or click ID. */
export function sanitizeCampaignDimension(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .replace(/[^A-Za-z0-9._~-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

export function campaignAttributionFromSearch(search: string): CampaignAttribution {
  const params = new URLSearchParams(search)
  return {
    utmSource: sanitizeCampaignDimension(params.get('utm_source')),
    utmMedium: sanitizeCampaignDimension(params.get('utm_medium')),
    utmCampaign: sanitizeCampaignDimension(params.get('utm_campaign')),
    utmContent: sanitizeCampaignDimension(params.get('utm_content')),
  }
}

export function campaignAttributionFromNotes(notes: string | undefined): CampaignAttribution {
  if (!notes) return { ...EMPTY_ATTRIBUTION }
  const values = new Map<string, string>()
  for (const line of notes.split('\n')) {
    const match = /^(utm_source|utm_medium|utm_campaign|utm_content):\s*(.*)$/.exec(line)
    if (match) values.set(match[1], sanitizeCampaignDimension(match[2]))
  }
  return {
    utmSource: values.get('utm_source') ?? '',
    utmMedium: values.get('utm_medium') ?? '',
    utmCampaign: values.get('utm_campaign') ?? '',
    utmContent: values.get('utm_content') ?? '',
  }
}

export function normalizeCampaignMetric(input: CampaignMetricInput): CampaignMetricInput {
  return {
    event: input.event,
    focus: input.focus,
    utmSource: sanitizeCampaignDimension(input.utmSource),
    utmMedium: sanitizeCampaignDimension(input.utmMedium),
    utmCampaign: sanitizeCampaignDimension(input.utmCampaign),
    utmContent: sanitizeCampaignDimension(input.utmContent),
  }
}

export function vietnamMetricDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function campaignMetricKey(date: string, input: CampaignMetricInput): string {
  return [
    date,
    input.focus,
    input.utmSource,
    input.utmMedium,
    input.utmCampaign,
    input.utmContent,
  ].join('|')
}
