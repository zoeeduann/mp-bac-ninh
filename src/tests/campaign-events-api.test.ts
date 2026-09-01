import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../app/api/campaign-events/route'
import { _resetForTest } from '../lib/rate-limit'

const { recordCampaignMetric, mockPayload } = vi.hoisted(() => ({
  recordCampaignMetric: vi.fn().mockResolvedValue(undefined),
  mockPayload: { db: { drizzle: { execute: vi.fn() } } },
}))

vi.mock('../payload.config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => mockPayload) }))
vi.mock('../lib/campaign-metrics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/campaign-metrics')>()
  return { ...actual, recordCampaignMetric }
})

function request(body: unknown, origin = 'https://mindfulpeacebacninh.com') {
  return new Request('https://mindfulpeacebacninh.com/api/campaign-events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
      'x-forwarded-for': '4.3.2.1',
    },
    body: JSON.stringify(body),
  }) as never
}

beforeEach(() => {
  _resetForTest()
  vi.clearAllMocks()
})

afterEach(() => vi.unstubAllEnvs())

describe('POST /api/campaign-events', () => {
  it.each(['page_view', 'form_start'] as const)('records a valid anonymous %s', async (event) => {
    const res = await POST(
      request({
        event,
        focus: 'mindfulness',
        attribution: { utmSource: 'google', utmCampaign: 'launch' },
      }),
    )
    expect(res.status).toBe(204)
    expect(recordCampaignMetric).toHaveBeenCalledWith(mockPayload, {
      event,
      focus: 'mindfulness',
      utmSource: 'google',
      utmMedium: '',
      utmCampaign: 'launch',
      utmContent: '',
    })
  })

  it('does not let the public endpoint claim a successful inquiry', async () => {
    const res = await POST(request({ event: 'lead_success', focus: 'buddhism' }))
    expect(res.status).toBe(400)
    expect(recordCampaignMetric).not.toHaveBeenCalled()
  })

  it('rejects contact details or other extra fields instead of persisting them', async () => {
    const res = await POST(
      request({ event: 'page_view', focus: 'buddhism', name: 'Test', zalo: '0912345678' }),
    )
    expect(res.status).toBe(400)
    expect(recordCampaignMetric).not.toHaveBeenCalled()
  })

  it('rejects cross-origin production requests', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await POST(
      request({ event: 'page_view', focus: 'buddhism' }, 'https://attacker.example'),
    )
    expect(res.status).toBe(403)
    expect(recordCampaignMetric).not.toHaveBeenCalled()
  })
})
