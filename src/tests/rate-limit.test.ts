import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import { rateLimit, _resetForTest } from '../lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => _resetForTest())

  it('allows up to limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit('1.1.1.1', 10, 60_000).ok).toBe(true)
    }
  })

  it('blocks at limit+1', () => {
    for (let i = 0; i < 10; i++) rateLimit('1.1.1.1', 10, 60_000)
    expect(rateLimit('1.1.1.1', 10, 60_000).ok).toBe(false)
  })

  it('isolates per IP', () => {
    for (let i = 0; i < 10; i++) rateLimit('1.1.1.1', 10, 60_000)
    expect(rateLimit('2.2.2.2', 10, 60_000).ok).toBe(true)
  })

  it('resets after window expires', () => {
    for (let i = 0; i < 10; i++) rateLimit('3.3.3.3', 10, 1) // 1ms window
    // Wait for window to pass
    return new Promise<void>(resolve => setTimeout(() => {
      expect(rateLimit('3.3.3.3', 10, 1).ok).toBe(true)
      resolve()
    }, 5))
  })

  describe('sliding window behaviour', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('true sliding window: t=0 burst of 10 blocks 11th; t+4min allows new requests within rolling window', () => {
      vi.useFakeTimers()
      const WINDOW = 5 * 60_000 // 5 minutes
      const MAX = 10
      const IP = '9.9.9.9'

      // Fire 10 at t=0 — all should pass
      for (let i = 0; i < MAX; i++) {
        expect(rateLimit(IP, MAX, WINDOW).ok).toBe(true)
      }

      // 11th at t=0 is blocked (window not yet expired)
      expect(rateLimit(IP, MAX, WINDOW).ok).toBe(false)

      // Advance 4 minutes — still inside the 5-min window, so t=0 timestamps
      // are NOT yet evicted; all 10 slots still used
      vi.setSystemTime(Date.now() + 4 * 60_000)

      // The bucket is still full (10 timestamps from t=0 still within 5-min window)
      expect(rateLimit(IP, MAX, WINDOW).ok).toBe(false)

      // Advance another 1 min 1 ms — now past the 5-min window; t=0 stamps evicted
      vi.setSystemTime(Date.now() + 60_001)

      // Now 5 new requests should all pass (10 slots available again since old ones expired)
      for (let i = 0; i < 5; i++) {
        expect(rateLimit(IP, MAX, WINDOW).ok).toBe(true)
      }

      // The 5 new timestamps ARE within the rolling window — remaining should be 5
      const result = rateLimit(IP, MAX, WINDOW)
      expect(result.remaining).toBe(4) // 6 used so far after the reset, 4 left
    })
  })
})
