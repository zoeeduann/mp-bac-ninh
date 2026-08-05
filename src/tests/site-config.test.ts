import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('single-location site configuration', () => {
  it('keeps location-prefixed URLs when no single location is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_LOCATION_SLUG', '')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://www.mindfulpeaceth.com')
    const { locationPath, locationUrl } = await import('@/lib/site-config')

    expect(locationPath('zh-CN', 'chiangmai', '/activities')).toBe(
      '/chiangmai/activities',
    )
    expect(locationUrl('en', 'chiangmai', '/about')).toBe(
      'https://www.mindfulpeaceth.com/en/chiangmai/about',
    )
  })

  it('publishes the configured location at the domain root', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_LOCATION_SLUG', 'bac-ninh')
    vi.stubEnv('NEXT_PUBLIC_SERVER_URL', 'https://mindfulpeacebacninh.com/')
    const { GOOGLE_ANALYTICS_ID, locationPath, locationUrl } = await import(
      '@/lib/site-config'
    )

    expect(locationPath('zh-CN', 'bac-ninh')).toBe('/')
    expect(locationPath('en', 'bac-ninh', '/activities')).toBe('/en/activities')
    expect(locationUrl('zh-CN', 'bac-ninh', '/journal')).toBe(
      'https://mindfulpeacebacninh.com/journal',
    )
    expect(GOOGLE_ANALYTICS_ID).toBe('G-0WNPPNKYE4')
  })

  it('allows a deployment-specific analytics ID override', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_LOCATION_SLUG', 'bac-ninh')
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID', 'G-OVERRIDE123')
    const { GOOGLE_ANALYTICS_ID } = await import('@/lib/site-config')

    expect(GOOGLE_ANALYTICS_ID).toBe('G-OVERRIDE123')
  })
})
