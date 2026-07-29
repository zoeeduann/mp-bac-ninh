import type { Access } from 'payload'

export const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

export const isAdminOrStaff: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

export const isAdminOrScopedStaff: Access = ({ req }) => {
  const user = req?.user as { role?: string; staffLocation?: unknown } | undefined
  if (user?.role === 'admin') return true
  if (user?.role !== 'staff') return false
  return relationId(user.staffLocation) != null
}

export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

export const denyAll: Access = () => false

/** Pull a numeric id from either a raw id or a populated relationship object. */
function relationId(v: unknown): number | string | null {
  if (v == null) return null
  if (typeof v === 'object') {
    const id = (v as { id?: number | string }).id
    return id ?? null
  }
  return v as number | string
}

/**
 * Per-academy access filter for collections that carry a `location`
 * relationship (Activities, Reservations, Journal).
 *
 * - admin → true (sees all)
 * - staff with staffLocation set → returns a Where filter on `location`
 * - staff without staffLocation set / wrong role / unauthenticated → false
 *
 * Use this for `access.read` and `access.update` on scoped collections.
 */
export const byStaffLocation: Access = ({ req }) => {
  const user = req?.user as { role?: string; staffLocation?: unknown } | undefined
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role !== 'staff') return false
  const id = relationId(user.staffLocation)
  if (id == null) return false
  return { location: { equals: id } }
}

/**
 * Scope access to the Location document assigned to a staff account.
 *
 * This differs from byStaffLocation because Locations is the academy record
 * itself, so the filter targets its `id` rather than a `location` relation.
 */
export const byOwnStaffLocation: Access = ({ req }) => {
  const user = req?.user as { role?: string; staffLocation?: unknown } | undefined
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role !== 'staff') return false
  const id = relationId(user.staffLocation)
  if (id == null) return false
  return { id: { equals: id } }
}

/**
 * beforeChange hook helper: overrides `data.location` with the staff
 * user's own staffLocation so even an API-direct POST can't slip a row
 * into another academy. Pass-through for admin (no override) and for
 * unauthenticated calls (they'll fail at the access layer anyway).
 */
export function forceStaffLocation<T extends Record<string, unknown>>(args: {
  req?: { user?: { role?: string; staffLocation?: unknown } }
  data: T
}): T {
  const user = args.req?.user
  if (!user || user.role !== 'staff') return args.data
  const id = relationId(user.staffLocation)
  if (id == null) return args.data
  return { ...args.data, location: id } as T
}
