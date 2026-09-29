import { describe, expect, it } from 'vitest'


import { getRouteParams } from '@/lib/route-params'

describe('getRouteParams', () => {
  it('decodes a percent-encoded Chinese slug', async () => {
    const p = await getRouteParams(
      Promise.resolve({ loc: 'chiangmai', slug: '%E7%A6%85%E8%8C%B6%E8%AF%BB%E4%B9%A6%E4%BC%9A' }),
    )
    expect(p).toEqual({ loc: 'chiangmai', slug: '禅茶读书会' })
  })

  it('leaves ASCII slugs and malformed encoding untouched', async () => {
    expect((await getRouteParams(Promise.resolve({ slug: 'mindfulness-coffee-day' }))).slug).toBe(
      'mindfulness-coffee-day',
    )
    expect((await getRouteParams(Promise.resolve({ slug: '%E7%A6' }))).slug).toBe('%E7%A6')
  })
})
