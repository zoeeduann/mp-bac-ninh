import { describe, expect, it } from 'vitest'
import {
  isAdmin,
  isAdminOrStaff,
  isLoggedIn,
  denyAll,
  byStaffLocation,
  byOwnStaffLocation,
  isAdminOrScopedStaff,
  forceStaffLocation,
} from '../access'
import { Locations } from '../collections/Locations'
import { Users } from '../collections/Users'

// Helper: build a minimal context object matching Payload's Access arg shape
const ctx = (user?: { role?: string; id?: string }) => ({ req: { user } }) as any

describe('access predicates', () => {
  it('isAdmin requires admin role', () => {
    expect(isAdmin(ctx({ role: 'admin' }))).toBe(true)
    expect(isAdmin(ctx({ role: 'staff' }))).toBe(false)
    expect(isAdmin(ctx())).toBe(false)
    expect(isAdmin(ctx(undefined))).toBe(false)
  })

  it('isAdminOrStaff accepts both roles', () => {
    expect(isAdminOrStaff(ctx({ role: 'admin' }))).toBe(true)
    expect(isAdminOrStaff(ctx({ role: 'staff' }))).toBe(true)
    expect(isAdminOrStaff(ctx())).toBe(false)
    expect(isAdminOrStaff(ctx(undefined))).toBe(false)
  })

  it('isLoggedIn checks presence of user', () => {
    expect(isLoggedIn(ctx({ role: 'staff' }))).toBe(true)
    expect(isLoggedIn(ctx({ role: 'admin' }))).toBe(true)
    expect(isLoggedIn(ctx())).toBe(false)
    expect(isLoggedIn(ctx(undefined))).toBe(false)
  })

  it('denyAll always returns false', () => {
    expect(denyAll(ctx({ role: 'admin' }))).toBe(false)
    expect(denyAll(ctx({ role: 'staff' }))).toBe(false)
    expect(denyAll(ctx())).toBe(false)
  })
})

describe('byStaffLocation — per-academy access filter', () => {
  it('admin sees everything (returns true, no filter)', () => {
    expect(byStaffLocation({ req: { user: { role: 'admin' } } } as any)).toBe(true)
  })

  it('staff with staffLocation set returns a Where filter on location', () => {
    const result = byStaffLocation({
      req: { user: { role: 'staff', staffLocation: 2 } },
    } as any)
    expect(result).toEqual({ location: { equals: 2 } })
  })

  it('staff with populated staffLocation object pulls the id', () => {
    const result = byStaffLocation({
      req: {
        user: { role: 'staff', staffLocation: { id: 3, slug: 'phuket' } },
      },
    } as any)
    expect(result).toEqual({ location: { equals: 3 } })
  })

  it('staff without staffLocation set sees nothing (returns false)', () => {
    expect(byStaffLocation({ req: { user: { role: 'staff' } } } as any)).toBe(false)
    expect(
      byStaffLocation({
        req: { user: { role: 'staff', staffLocation: null } },
      } as any),
    ).toBe(false)
  })

  it('unauthenticated or wrong-role users see nothing', () => {
    expect(byStaffLocation({ req: { user: undefined } } as any)).toBe(false)
    expect(byStaffLocation({ req: {} } as any)).toBe(false)
    expect(byStaffLocation({ req: { user: { role: 'editor' } } } as any)).toBe(false)
  })
})

describe('byOwnStaffLocation — academy profile access filter', () => {
  it('admin sees every academy profile', () => {
    expect(byOwnStaffLocation({ req: { user: { role: 'admin' } } } as any)).toBe(true)
  })

  it('staff only sees the academy profile assigned to the account', () => {
    expect(
      byOwnStaffLocation({
        req: { user: { role: 'staff', staffLocation: { id: 4, slug: 'bac-ninh' } } },
      } as any),
    ).toEqual({ id: { equals: 4 } })
  })

  it('staff without an assigned academy sees no academy profile', () => {
    expect(
      byOwnStaffLocation({ req: { user: { role: 'staff', staffLocation: null } } } as any),
    ).toBe(false)
  })
})

describe('isAdminOrScopedStaff — scoped content creation', () => {
  it('allows admins', () => {
    expect(isAdminOrScopedStaff({ req: { user: { role: 'admin' } } } as any)).toBe(true)
  })

  it('allows staff only when an academy is assigned', () => {
    expect(
      isAdminOrScopedStaff({
        req: { user: { role: 'staff', staffLocation: 2 } },
      } as any),
    ).toBe(true)
    expect(
      isAdminOrScopedStaff({
        req: { user: { role: 'staff', staffLocation: { id: 3 } } },
      } as any),
    ).toBe(true)
  })

  it('rejects staff without an assigned academy', () => {
    expect(isAdminOrScopedStaff({ req: { user: { role: 'staff' } } } as any)).toBe(false)
    expect(
      isAdminOrScopedStaff({
        req: { user: { role: 'staff', staffLocation: null } },
      } as any),
    ).toBe(false)
  })
})

describe('forceStaffLocation — server-side write enforcement', () => {
  it("overrides data.location to staff user's staffLocation", () => {
    const data = { title: 'X', location: 999 }
    const result = forceStaffLocation({
      req: { user: { role: 'staff', staffLocation: 2 } },
      data,
    } as any)
    expect(result).toEqual({ title: 'X', location: 2 })
  })

  it('accepts populated staffLocation object', () => {
    const result = forceStaffLocation({
      req: {
        user: { role: 'staff', staffLocation: { id: 3 } },
      },
      data: { title: 'X' },
    } as any)
    expect((result as any).location).toBe(3)
  })

  it('leaves data alone for admin (full control)', () => {
    const data = { title: 'X', location: 5 }
    const result = forceStaffLocation({
      req: { user: { role: 'admin' } },
      data,
    } as any)
    expect(result).toEqual({ title: 'X', location: 5 })
  })

  it('leaves data alone when staffLocation is not set (validation will catch missing location)', () => {
    const data = { title: 'X', location: 5 }
    const result = forceStaffLocation({
      req: { user: { role: 'staff' } },
      data,
    } as any)
    expect(result).toEqual({ title: 'X', location: 5 })
  })

  it('leaves data alone for unauthenticated calls', () => {
    const data = { title: 'X', location: 7 }
    const result = forceStaffLocation({ req: { user: undefined }, data } as any)
    expect(result).toEqual({ title: 'X', location: 7 })
  })
})

describe('Locations collection access — scoped academy profile', () => {
  const access = Locations.access!

  it('read is public (returns true for unauthenticated)', () => {
    expect((access.read as any)(ctx(undefined))).toBe(true)
  })

  it('staff reads only their assigned academy profile', () => {
    const result = (access.read as any)({
      req: { user: { role: 'staff', staffLocation: 4 } },
    })
    expect(result).toEqual({ id: { equals: 4 } })
  })

  it('admin can create', () => {
    expect((access.create as any)(ctx({ role: 'admin' }))).toBe(true)
  })

  it('staff cannot create', () => {
    expect((access.create as any)(ctx({ role: 'staff' }))).toBe(false)
  })

  it('admin can update', () => {
    expect((access.update as any)(ctx({ role: 'admin' }))).toBe(true)
  })

  it('staff can update only their assigned academy profile', () => {
    expect(
      (access.update as any)({
        req: { user: { role: 'staff', staffLocation: 4 } },
      }),
    ).toEqual({ id: { equals: 4 } })
    expect((access.update as any)(ctx({ role: 'staff' }))).toBe(false)
  })

  it('admin can delete', () => {
    expect((access.delete as any)(ctx({ role: 'admin' }))).toBe(true)
  })

  it('staff cannot delete', () => {
    expect((access.delete as any)(ctx({ role: 'staff' }))).toBe(false)
  })

  it('keeps structural fields admin-only', () => {
    for (const fieldName of ['slug', 'isThailandNetwork', 'order']) {
      const field = Locations.fields.find(
        (candidate) => 'name' in candidate && candidate.name === fieldName,
      )
      expect(field && 'access' in field && field.access?.update).toBeTypeOf('function')
      expect((field as any).access.update(ctx({ role: 'staff' }))).toBe(false)
      expect((field as any).access.update(ctx({ role: 'admin' }))).toBe(true)
    }
  })
})

describe('Users collection access — staff account privacy', () => {
  const access = Users.access!

  it('admin can read every account', () => {
    expect((access.read as any)(ctx({ role: 'admin', id: '1' }))).toBe(true)
  })

  it('staff can read only their own account', () => {
    expect((access.read as any)(ctx({ role: 'staff', id: 'staff-4' }))).toEqual({
      id: { equals: 'staff-4' },
    })
  })

  it('unauthenticated users cannot read accounts', () => {
    expect((access.read as any)(ctx(undefined))).toBe(false)
  })
})
