import { describe, expect, it } from 'vitest'
import { justifiedRows } from '@/lib/justified-rows'

const PORTRAIT = 3 / 4
const PHONE = 9 / 16
const PANORAMA = 1600 / 675

describe('justifiedRows', () => {
  it('handles empty input', () => {
    expect(justifiedRows([], 2.3)).toEqual([])
  })

  it('keeps a small set of portraits on one row', () => {
    expect(justifiedRows([PORTRAIT, PORTRAIT], 2.3)).toEqual([[0, 1]])
    expect(justifiedRows([PORTRAIT, PORTRAIT, PORTRAIT], 2.3)).toEqual([[0, 1, 2]])
  })

  it('gives a panorama its own row', () => {
    expect(justifiedRows([PANORAMA, PANORAMA], 2.3)).toEqual([[0], [1]])
  })

  it('balances rows instead of leaving a lone last photo', () => {
    const rows = justifiedRows(Array(8).fill(PORTRAIT), 2.3)
    expect(rows.flat()).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(Math.min(...rows.map((r) => r.length))).toBeGreaterThan(1)
  })

  it('keeps every photo in order exactly once', () => {
    const ratios = [PHONE, PHONE, PORTRAIT, PANORAMA, PHONE, 1, 1.5, PORTRAIT, PHONE]
    expect(justifiedRows(ratios, 2.3).flat()).toEqual(ratios.map((_, i) => i))
  })
})
