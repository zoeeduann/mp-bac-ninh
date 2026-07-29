/**
 * Unit tests for getCapacityForOccurrence in lib/content.ts
 *
 * We mock the payload client so no real DB is needed.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mock the payload import ────────────────────────────────────────────
const mockFind = vi.fn()

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(() =>
    Promise.resolve({ find: mockFind }),
  ),
}))

// Import AFTER mocking
import { getCapacityForOccurrence } from '@/lib/content'

beforeEach(() => {
  mockFind.mockReset()
})

describe('getCapacityForOccurrence()', () => {
  it('returns occupied=0, remaining=capacity when no reservations', async () => {
    mockFind.mockResolvedValue({ docs: [] })

    const result = await getCapacityForOccurrence(1, 'occ-1', 12)

    expect(result).toEqual({ occupied: 0, remaining: 12 })
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'reservations',
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { activity: { equals: 1 } },
            { occurrenceId: { equals: 'occ-1' } },
            { status: { in: ['pending', 'confirmed'] } },
          ]),
        }),
      }),
    )
  })

  it('sums guests from pending + confirmed reservations', async () => {
    mockFind.mockResolvedValue({
      docs: [
        { status: 'confirmed', guests: 2 },
        { status: 'pending', guests: 3 },
      ],
    })

    const result = await getCapacityForOccurrence(1, 'occ-1', 12)

    expect(result).toEqual({ occupied: 5, remaining: 7 })
  })

  it('treats missing guests field as 1', async () => {
    mockFind.mockResolvedValue({
      docs: [
        { status: 'confirmed' }, // no guests field
        { status: 'confirmed', guests: 2 },
      ],
    })

    const result = await getCapacityForOccurrence(1, 'occ-1', 10)

    expect(result).toEqual({ occupied: 3, remaining: 7 })
  })

  it('returns remaining=0 when fully booked (does not go negative)', async () => {
    mockFind.mockResolvedValue({
      docs: [{ status: 'confirmed', guests: 15 }],
    })

    const result = await getCapacityForOccurrence(1, 'occ-1', 12)

    expect(result.remaining).toBe(0)
    expect(result.occupied).toBe(15)
  })
})
