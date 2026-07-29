import { describe, expect, it } from 'vitest'
import { formatICT, toUtcISO, formatDateLong } from '../lib/time'

describe('time helpers', () => {
  it('formats UTC ISO in ICT', () => {
    expect(formatICT(new Date('2026-09-20T02:30:00Z'))).toMatch(/9:30/) // 02:30 UTC = 09:30 ICT
  })
  it('round-trips local Bangkok time to UTC ISO', () => {
    // 2026-09-20 09:30 ICT == 02:30 UTC
    expect(toUtcISO('2026-09-20T09:30', 'Asia/Bangkok')).toBe('2026-09-20T02:30:00.000Z')
  })
  it('formats long date in Chinese', () => {
    expect(formatDateLong(new Date('2026-09-20T02:30:00Z'), 'zh-CN'))
      .toContain('9月20日')
  })
  it('formats long date in English', () => {
    const result = formatDateLong(new Date('2026-09-20T02:30:00Z'), 'en')
    expect(result).toContain('Sep')
    expect(result).toContain('2026')
    expect(result).toContain('ICT')
  })
})
