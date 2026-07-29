import { describe, expect, it } from 'vitest'
import { computeOccupancy, canBook, type ReservationLike } from '../lib/capacity'

const r = (status: ReservationLike['status'], guests: number, occurrenceId = 'occ1'): ReservationLike =>
  ({ status, guests, occurrenceId })

describe('capacity', () => {
  describe('computeOccupancy', () => {
    it('counts pending + confirmed', () => {
      expect(computeOccupancy([r('pending', 2), r('confirmed', 3)], 'occ1')).toBe(5)
    })
    it('excludes waitlist, cancelled, deleted', () => {
      expect(computeOccupancy(
        [r('pending', 1), r('waitlist', 5), r('cancelled', 2), r('deleted', 3)],
        'occ1',
      )).toBe(1)
    })
    it('filters by occurrence', () => {
      expect(computeOccupancy(
        [r('confirmed', 2, 'occ1'), r('confirmed', 4, 'occ2')],
        'occ1',
      )).toBe(2)
    })
  })

  describe('canBook', () => {
    it('allows when capacity sufficient', () => {
      expect(canBook({ capacity: 10, occupied: 7, guests: 2 })).toEqual({ ok: true })
    })
    it('blocks at the edge', () => {
      expect(canBook({ capacity: 10, occupied: 9, guests: 2 })).toEqual({ ok: false, reason: 'capacity_full' })
    })
    it('respects override', () => {
      expect(canBook({ capacity: 10, override: 5, occupied: 4, guests: 2 })).toEqual({ ok: false, reason: 'capacity_full' })
    })
  })
})
