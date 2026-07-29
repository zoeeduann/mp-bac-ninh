import { describe, expect, it } from 'vitest'
import {
  extractLocationSlug,
  isThailandNetworkLocation,
  LOCATION_SLUGS,
  locationSiteName,
} from '../lib/current-location'

describe('extractLocationSlug', () => {
  it('extracts bangkok from /bangkok', () => {
    expect(extractLocationSlug('/bangkok')).toBe('bangkok')
  })

  it('extracts chiangmai from /chiangmai/activities', () => {
    expect(extractLocationSlug('/chiangmai/activities')).toBe('chiangmai')
  })

  it('extracts phuket from /phuket/about', () => {
    expect(extractLocationSlug('/phuket/about')).toBe('phuket')
  })

  it('extracts the standalone Bac Ninh page', () => {
    expect(extractLocationSlug('/bac-ninh')).toBe('bac-ninh')
  })

  it('returns null for the portal root /', () => {
    expect(extractLocationSlug('/')).toBeNull()
  })

  it('returns null for unknown slug', () => {
    expect(extractLocationSlug('/unknown-place')).toBeNull()
  })

  it('returns null for /admin paths', () => {
    expect(extractLocationSlug('/admin/dashboard')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractLocationSlug('')).toBeNull()
  })

  it('handles path without leading slash', () => {
    expect(extractLocationSlug('chiangmai/journal')).toBe('chiangmai')
  })

  it('strips a leading /en before resolving the location', () => {
    expect(extractLocationSlug('/en/chiangmai')).toBe('chiangmai')
    expect(extractLocationSlug('/en')).toBeNull()
  })
})

describe('LOCATION_SLUGS', () => {
  it('contains the three network locations and the standalone page', () => {
    expect(LOCATION_SLUGS).toEqual(['bangkok', 'chiangmai', 'phuket', 'bac-ninh'])
  })
})

describe('location network scope', () => {
  it('keeps Bac Ninh Shanming Courtyard independent from the Thailand portal', () => {
    const location = {
      slug: 'bac-ninh',
      name: '越南北宁善明小院',
      isThailandNetwork: false,
    }

    expect(isThailandNetworkLocation(location)).toBe(false)
    expect(locationSiteName(location, 'zh-CN')).toBe('越南北宁善明小院')
  })

  it('keeps Thailand academies under the Thailand network identity', () => {
    const location = {
      slug: 'chiangmai',
      name: '清迈心灯学堂',
      isThailandNetwork: true,
    }

    expect(isThailandNetworkLocation(location)).toBe(true)
    expect(locationSiteName(location, 'en')).toBe('Mindfulpeace Academy Thailand')
  })
})
