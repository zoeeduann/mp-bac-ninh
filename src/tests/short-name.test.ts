import { describe, expect, it } from 'vitest'
import { shortName, academyName } from '@/lib/short-name'

describe('shortName()', () => {
  it('strips city prefix + 学堂 suffix for 清迈心灯学堂', () => {
    expect(shortName('清迈', '清迈心灯学堂')).toBe('心灯')
  })

  it('strips city prefix + 学堂 suffix for 曼谷如如学堂', () => {
    expect(shortName('曼谷', '曼谷如如学堂')).toBe('如如')
  })

  it('strips city prefix for 普吉和光小院 → 和光小院 (no 学堂 suffix to strip)', () => {
    expect(shortName('普吉', '普吉和光小院')).toBe('和光小院')
  })

  it('falls back to original name when everything strips', () => {
    // Edge case: a hypothetical name that's exactly city + 学堂 with no sub-name
    expect(shortName('普吉', '普吉学堂')).toBe('普吉学堂')
  })

  it('strips city prefix + Academy suffix for Chiang Mai Xindeng Academy', () => {
    expect(shortName('Chiang Mai', 'Chiang Mai Xindeng Academy')).toBe('Xindeng')
  })

  it('strips city prefix + Academy suffix for Bangkok Ruru Academy', () => {
    expect(shortName('Bangkok', 'Bangkok Ruru Academy')).toBe('Ruru')
  })

  it('returns the original name unchanged when city is not a prefix', () => {
    expect(shortName('Bangkok', 'Heartland Zen Academy')).toBe('Heartland Zen')
  })
})

describe('academyName()', () => {
  it('strips city prefix but keeps 学堂 suffix: 清迈心灯学堂 → 心灯学堂', () => {
    expect(academyName('清迈', '清迈心灯学堂')).toBe('心灯学堂')
  })

  it('strips city prefix but keeps 学堂 suffix: 曼谷如如学堂 → 如如学堂', () => {
    expect(academyName('曼谷', '曼谷如如学堂')).toBe('如如学堂')
  })

  it('strips city prefix for 普吉和光小院 → 和光小院', () => {
    expect(academyName('普吉', '普吉和光小院')).toBe('和光小院')
  })

  it('falls back to original when stripping leaves only the 学堂 suffix', () => {
    expect(academyName('普吉', '普吉学堂')).toBe('普吉学堂')
  })

  it('strips city prefix but keeps Academy suffix: Chiang Mai Xindeng Academy → Xindeng Academy', () => {
    expect(academyName('Chiang Mai', 'Chiang Mai Xindeng Academy')).toBe('Xindeng Academy')
  })

  it('strips city prefix but keeps Academy suffix: Bangkok Ruru Academy → Ruru Academy', () => {
    expect(academyName('Bangkok', 'Bangkok Ruru Academy')).toBe('Ruru Academy')
  })

  it('returns the original name when city is not a prefix', () => {
    expect(academyName('Bangkok', 'Heartland Zen Academy')).toBe('Heartland Zen Academy')
  })
})
