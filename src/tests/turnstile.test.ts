import { describe, expect, it, vi, afterEach } from 'vitest'
import { verifyTurnstile } from '../lib/turnstile'

describe('verifyTurnstile', () => {
  const originalKey = process.env.TURNSTILE_SECRET_KEY

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalKey
    }
    vi.restoreAllMocks()
  })

  it('passes on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as any
    process.env.TURNSTILE_SECRET_KEY = 'test'
    expect(await verifyTurnstile('token', '1.2.3.4')).toBe(true)
  })

  it('fails on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid'] }),
    }) as any
    process.env.TURNSTILE_SECRET_KEY = 'test'
    expect(await verifyTurnstile('bad', '1.2.3.4')).toBe(false)
  })

  it('bypasses in dev when no secret key is set', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    // NODE_ENV is 'test' (not 'production') in vitest — bypass applies
    expect(await verifyTurnstile('anything')).toBe(true)
  })
})
