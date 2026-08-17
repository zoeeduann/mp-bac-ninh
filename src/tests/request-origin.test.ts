import { describe, expect, it } from 'vitest'
import { isAllowedSameOriginRequest } from '@/lib/request-origin'

describe('same-origin reservation requests', () => {
  it('allows matching production origins', () => {
    expect(
      isAllowedSameOriginRequest({
        requestUrl: 'https://mindfulpeacebacninh.com/api/reservations',
        origin: 'https://mindfulpeacebacninh.com',
        isProduction: true,
      }),
    ).toBe(true)
  })

  it('rejects missing, malformed, and cross-site production origins', () => {
    const requestUrl = 'https://mindfulpeacebacninh.com/api/reservations'

    expect(
      isAllowedSameOriginRequest({ requestUrl, origin: null, isProduction: true }),
    ).toBe(false)
    expect(
      isAllowedSameOriginRequest({ requestUrl, origin: 'not a URL', isProduction: true }),
    ).toBe(false)
    expect(
      isAllowedSameOriginRequest({
        requestUrl,
        origin: 'https://example.com',
        isProduction: true,
      }),
    ).toBe(false)
  })

  it('does not block local development and tests', () => {
    expect(
      isAllowedSameOriginRequest({
        requestUrl: 'http://localhost:3000/api/reservations',
        origin: null,
        isProduction: false,
      }),
    ).toBe(true)
  })
})
