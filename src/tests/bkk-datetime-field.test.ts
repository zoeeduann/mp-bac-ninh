import { describe, expect, it } from 'vitest'
import {
  utcIsoToBkkInputValue,
  bkkInputValueToUtcIso,
} from '@/lib/bkk-datetime'

describe('utcIsoToBkkInputValue()', () => {
  it('formats a UTC ISO into a Bangkok wall-clock datetime-local value', () => {
    // 2026-06-10T02:30Z is 2026-06-10T09:30 in Bangkok (UTC+7)
    expect(utcIsoToBkkInputValue('2026-06-10T02:30:00.000Z')).toBe(
      '2026-06-10T09:30',
    )
  })

  it('handles a midnight UTC that crosses to the next BKK day', () => {
    // 2026-06-09T20:00Z is 2026-06-10T03:00 BKK
    expect(utcIsoToBkkInputValue('2026-06-09T20:00:00.000Z')).toBe(
      '2026-06-10T03:00',
    )
  })

  it('returns empty string when input is missing or invalid', () => {
    expect(utcIsoToBkkInputValue(null)).toBe('')
    expect(utcIsoToBkkInputValue(undefined)).toBe('')
    expect(utcIsoToBkkInputValue('')).toBe('')
    expect(utcIsoToBkkInputValue('not-a-date')).toBe('')
  })
})

describe('bkkInputValueToUtcIso()', () => {
  it('treats the input as Bangkok local time and returns UTC ISO', () => {
    // Editor picks 2026-06-10 09:30 (BKK) → 2026-06-10T02:30Z
    expect(bkkInputValueToUtcIso('2026-06-10T09:30')).toBe(
      '2026-06-10T02:30:00.000Z',
    )
  })

  it('round-trips: UTC → BKK input → UTC stays identical', () => {
    const utc = '2026-06-15T07:45:00.000Z'
    const back = bkkInputValueToUtcIso(utcIsoToBkkInputValue(utc))
    expect(back).toBe(utc)
  })

  it('returns null for empty / unparseable input', () => {
    expect(bkkInputValueToUtcIso('')).toBeNull()
    expect(bkkInputValueToUtcIso('not-a-date')).toBeNull()
  })
})
