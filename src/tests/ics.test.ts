import { describe, expect, it } from 'vitest'
import { buildIcs } from '../lib/ics'

const BASE_EVENT = {
  uid: 'booking-42@shanmingspace.vn',
  startUtc: new Date('2026-06-15T02:00:00Z'),
  endUtc: new Date('2026-06-15T04:00:00Z'),
  summary: 'Introduction to Meditation',
}

describe('buildIcs', () => {
  it('formats dates in UTC (Z-suffix)', () => {
    const ics = buildIcs(BASE_EVENT)
    expect(ics).toContain('DTSTART:20260615T020000Z')
    expect(ics).toContain('DTEND:20260615T040000Z')
  })

  it('escapes special characters in text fields', () => {
    const ics = buildIcs({
      ...BASE_EVENT,
      summary: 'Tea & Meditation, with: special;chars\\end',
      description: 'Line1\nLine2,comma;semi\\back',
    })
    expect(ics).toContain('SUMMARY:Tea & Meditation\\, with: special\\;chars\\\\end')
    expect(ics).toContain('DESCRIPTION:Line1\\nLine2\\,comma\\;semi\\\\back')
  })

  it('folds long description lines per RFC 5545 (>75 chars)', () => {
    const longDesc = 'A'.repeat(100)
    const ics = buildIcs({ ...BASE_EVENT, description: longDesc })
    // Each line (after CRLF split) must not exceed 75 chars
    const lines = ics.split('\r\n')
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(75)
    }
    // Folded lines (continuations) start with a space
    const hasFolded = lines.some((l) => l.startsWith(' '))
    expect(hasFolded).toBe(true)
  })

  it('folds Unicode lines by UTF-8 octets without splitting characters', () => {
    const ics = buildIcs({ ...BASE_EVENT, description: '北宁善明静心小院'.repeat(20) })
    const encoder = new TextEncoder()
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(ics).toContain('DESCRIPTION:北宁善明静心小院')
  })

  it('starts with BEGIN:VCALENDAR and ends with END:VCALENDAR CRLF', () => {
    const ics = buildIcs(BASE_EVENT)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('handles multi-day events (endUtc on a different day)', () => {
    const ics = buildIcs({
      ...BASE_EVENT,
      startUtc: new Date('2026-07-01T08:00:00Z'),
      endUtc: new Date('2026-07-03T17:00:00Z'),
      summary: 'Residential Retreat',
      locationName: 'Chiang Mai Xindeng Academy, Thailand',
      organizerEmail: 'admin@mindfulpeaceth.com',
    })
    expect(ics).toContain('DTSTART:20260701T080000Z')
    expect(ics).toContain('DTEND:20260703T170000Z')
    expect(ics).toContain('LOCATION:Chiang Mai Xindeng Academy\\, Thailand')
    expect(ics).toContain('ORGANIZER:mailto:admin@mindfulpeaceth.com')
  })

  it('uses configurable Bac Ninh calendar branding and timezone', () => {
    const ics = buildIcs({
      ...BASE_EVENT,
      productName: '北宁善明静心小院',
      timeZone: 'Asia/Ho_Chi_Minh',
      locationName: '北宁善明静心小院, 越南北宁省',
      organizerEmail: 'hello@shanmingspace.vn',
    })
    expect(ics).toContain('PRODID:-//北宁善明静心小院//Booking//EN')
    expect(ics).toContain('X-WR-TIMEZONE:Asia/Ho_Chi_Minh')
    expect(ics).not.toMatch(/Thailand|Bangkok|mindfulpeaceth\.com/i)
  })
})
