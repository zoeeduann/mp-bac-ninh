export type ReservationLike = {
  status: 'pending' | 'confirmed' | 'waitlist' | 'cancelled' | 'deleted'
  guests: number
  occurrenceId: string
}

const COUNTED = new Set(['pending', 'confirmed'])

export function computeOccupancy(reservations: ReservationLike[], occurrenceId: string): number {
  return reservations
    .filter(r => r.occurrenceId === occurrenceId && COUNTED.has(r.status))
    .reduce((sum, r) => sum + r.guests, 0)
}

export function canBook(args: {
  capacity: number
  override?: number | null
  occupied: number
  guests: number
}): { ok: true } | { ok: false; reason: 'capacity_full' } {
  const limit = args.override ?? args.capacity
  return args.occupied + args.guests <= limit
    ? { ok: true }
    : { ok: false, reason: 'capacity_full' }
}
