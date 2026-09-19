import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendMail } from '../lib/email'

const { smtpSend } = vi.hoisted(() => ({ smtpSend: vi.fn() }))
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: smtpSend })) },
}))

beforeEach(() => {
  vi.clearAllMocks()
  smtpSend.mockResolvedValue({})
  vi.stubEnv('GMAIL_USER', 'sender@example.com')
  vi.stubEnv('GMAIL_APP_PASSWORD', 'test-only')
  vi.stubEnv('RESEND_FROM', 'sender@example.com')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe.each(['smtp', 'resend'] as const)('email sender branding via %s', (provider) => {
  it.each([
    { site: 'bac-ninh', fromName: undefined, expected: '越南北宁善明静心小院' },
    { site: 'bac-ninh', fromName: '', expected: '越南北宁善明静心小院' },
    { site: 'bac-ninh', fromName: 'Shanming Mindful Peace Yard', expected: 'Shanming Mindful Peace Yard' },
    { site: '', fromName: undefined, expected: '静心学堂 · 泰国' },
  ])('uses $expected for the outgoing sender header', async ({ site, fromName, expected }) => {
    vi.stubEnv('NEXT_PUBLIC_SITE_LOCATION_SLUG', site)
    vi.stubEnv('RESEND_API_KEY', provider === 'resend' ? 'test-only' : '')
    const fetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetch)

    await sendMail({ to: 'staff@example.com', subject: 'Test', body: 'Test only', fromName })

    if (provider === 'smtp') {
      expect(smtpSend).toHaveBeenCalledWith(expect.objectContaining({
        from: `"${expected}" <sender@example.com>`,
        to: 'staff@example.com',
      }))
      expect(fetch).not.toHaveBeenCalled()
    } else {
      expect(fetch).toHaveBeenCalledTimes(1)
      const sent = JSON.parse(fetch.mock.calls[0][1].body)
      expect(sent.from).toBe(`${expected} <sender@example.com>`)
      expect(sent.to).toEqual(['staff@example.com'])
      expect(smtpSend).not.toHaveBeenCalled()
    }
  })
})
