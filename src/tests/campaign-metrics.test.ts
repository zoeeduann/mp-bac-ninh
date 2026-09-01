import { describe, expect, it } from 'vitest'
import {
  campaignAttributionFromNotes,
  campaignAttributionFromSearch,
  campaignMetricKey,
  normalizeCampaignMetric,
  vietnamMetricDate,
} from '../lib/campaign-metrics'

describe('anonymous campaign metric dimensions', () => {
  it('keeps only the four short UTM dimensions and ignores click IDs and arbitrary parameters', () => {
    const attribution = campaignAttributionFromSearch(
      '?utm_source=google&utm_medium=cpc&utm_campaign=bacninh launch&utm_content=creative-a&gclid=secret&name=Li',
    )
    expect(attribution).toEqual({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'bacninh_launch',
      utmContent: 'creative-a',
    })
    expect(JSON.stringify(attribution)).not.toMatch(/gclid|secret|Li/)
  })

  it('extracts the same safe attribution from persisted inquiry notes', () => {
    expect(
      campaignAttributionFromNotes(
        '广告落地页咨询\nutm_source: google\nutm_campaign: launch 01\ngclid: ignored\n姓名: ignored',
      ),
    ).toEqual({
      utmSource: 'google',
      utmMedium: '',
      utmCampaign: 'launch_01',
      utmContent: '',
    })
  })

  it('groups dates in Vietnam time and builds no identifier into its aggregate key', () => {
    expect(vietnamMetricDate(new Date('2026-08-31T17:30:00.000Z'))).toBe('2026-09-01')
    const input = normalizeCampaignMetric({
      event: 'page_view',
      focus: 'mindfulness',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'launch',
      utmContent: 'creative_a',
    })
    expect(campaignMetricKey('2026-09-01', input)).toBe(
      '2026-09-01|mindfulness|google|cpc|launch|creative_a',
    )
  })
})
