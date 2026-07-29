import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_INDEXNOW_KEY,
  getIndexNowKey,
  indexNowKeyLocation,
  isValidIndexNowKey,
  submitIndexNowUrls,
  uniqueIndexNowUrls,
} from '@/lib/indexnow'
import {
  indexNowUrlsForActivity,
  indexNowUrlsForJournal,
  indexNowUrlsForLocationSlug,
} from '@/lib/indexnow-content'

describe('IndexNow protocol helpers', () => {
  it('uses the committed default key unless env overrides it', () => {
    expect(getIndexNowKey({})).toBe(DEFAULT_INDEXNOW_KEY)
    expect(getIndexNowKey({ INDEXNOW_KEY: 'custom-key-123' })).toBe('custom-key-123')
    expect(getIndexNowKey({ INDEXNOW_DISABLED: 'true' })).toBeNull()
  })

  it('validates key shape and key location', () => {
    expect(isValidIndexNowKey('abcd1234')).toBe(true)
    expect(isValidIndexNowKey('too')).toBe(false)
    expect(isValidIndexNowKey('not_valid!')).toBe(false)
    expect(indexNowKeyLocation('abcd1234', 'https://example.com/path')).toBe(
      'https://example.com/abcd1234.txt',
    )
  })

  it('keeps only same-host URLs, strips fragments, and dedupes', () => {
    expect(uniqueIndexNowUrls([
      '/chiangmai',
      'https://example.com/chiangmai#section',
      'https://other.example.com/chiangmai',
      'mailto:test@example.com',
    ], 'https://example.com')).toEqual(['https://example.com/chiangmai'])
  })

  it('skips localhost submissions by default', async () => {
    const fetchImpl = vi.fn()

    const result = await submitIndexNowUrls(['/chiangmai'], {
      base: 'http://localhost:3000',
      key: 'abcd1234',
      fetchImpl,
    })

    expect(result).toMatchObject({
      ok: true,
      skipped: true,
      reason: 'local-or-invalid-base',
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('posts a batch payload to the IndexNow endpoint', async () => {
    const fetchImpl = vi.fn(async (_input: string, _init?: RequestInit) =>
      new Response('accepted', { status: 202 }))

    const result = await submitIndexNowUrls(['/chiangmai', '/en/chiangmai'], {
      base: 'https://mindfulpeaceth.com',
      key: 'abcd1234',
      fetchImpl,
    })

    expect(result.ok).toBe(true)
    expect(result.status).toBe(202)
    expect(fetchImpl).toHaveBeenCalledOnce()

    const call = fetchImpl.mock.calls[0] as [string, RequestInit]
    const [endpoint, init] = call
    const body = JSON.parse(String(init.body))
    expect(endpoint).toBe('https://api.indexnow.org/indexnow')
    expect(body).toEqual({
      host: 'mindfulpeaceth.com',
      key: 'abcd1234',
      keyLocation: 'https://mindfulpeaceth.com/abcd1234.txt',
      urlList: [
        'https://mindfulpeaceth.com/chiangmai',
        'https://mindfulpeaceth.com/en/chiangmai',
      ],
    })
  })
})

describe('IndexNow content URL builders', () => {
  const base = 'https://mindfulpeaceth.com'

  it('builds all public location URLs in both locales', () => {
    expect(indexNowUrlsForLocationSlug('chiangmai', base)).toEqual([
      'https://mindfulpeaceth.com/',
      'https://mindfulpeaceth.com/en',
      'https://mindfulpeaceth.com/chiangmai',
      'https://mindfulpeaceth.com/en/chiangmai',
      'https://mindfulpeaceth.com/chiangmai/activities',
      'https://mindfulpeaceth.com/en/chiangmai/activities',
      'https://mindfulpeaceth.com/chiangmai/journal',
      'https://mindfulpeaceth.com/en/chiangmai/journal',
      'https://mindfulpeaceth.com/chiangmai/about',
      'https://mindfulpeaceth.com/en/chiangmai/about',
      'https://mindfulpeaceth.com/chiangmai/contact',
      'https://mindfulpeaceth.com/en/chiangmai/contact',
      'https://mindfulpeaceth.com/chiangmai/book',
      'https://mindfulpeaceth.com/en/chiangmai/book',
    ])
  })

  it('builds activity detail, activity list, and academy URLs', async () => {
    const urls = await indexNowUrlsForActivity({
      slug: 'tea-meditation',
      location: { slug: 'chiangmai' },
    }, null, undefined, base)

    expect(urls).toEqual([
      'https://mindfulpeaceth.com/chiangmai/activities/tea-meditation',
      'https://mindfulpeaceth.com/en/chiangmai/activities/tea-meditation',
      'https://mindfulpeaceth.com/chiangmai/activities',
      'https://mindfulpeaceth.com/en/chiangmai/activities',
      'https://mindfulpeaceth.com/chiangmai',
      'https://mindfulpeaceth.com/en/chiangmai',
    ])
  })

  it('resolves a relationship id through Payload when needed', async () => {
    const findByID = vi.fn(async () => ({ slug: 'phuket' }))

    const urls = await indexNowUrlsForJournal({
      slug: 'summer-practice',
      location: 3,
    }, null, { payload: { findByID } }, base)

    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'locations',
      id: 3,
    }))
    expect(urls[0]).toBe('https://mindfulpeaceth.com/phuket/journal/summer-practice')
    expect(urls[1]).toBe('https://mindfulpeaceth.com/en/phuket/journal/summer-practice')
  })
})
