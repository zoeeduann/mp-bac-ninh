import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/translate', () => ({ translateForSlug: vi.fn(async () => null) }))

import { normalizeActivitySlug, validateActivitySlug } from '@/collections/activity-slug'

describe('activity slug', () => {
  it('trims a typed slug', async () => {
    expect(await normalizeActivitySlug('  mindfulness-ball ', { title: '正念球' })).toBe(
      'mindfulness-ball',
    )
  })

  it('regenerates a whitespace-only slug from the title', async () => {
    const translate = vi.fn(async () => 'Health in Full Circle')
    expect(await normalizeActivitySlug('  ', { title: '健康大循环' }, translate)).toBe(
      'health-in-full-circle',
    )
    expect(translate).toHaveBeenCalledWith('健康大循环')
  })

  it('rejects empty and whitespace-only slugs on save', () => {
    expect(validateActivitySlug('  ')).not.toBe(true)
    expect(validateActivitySlug('')).not.toBe(true)
    expect(validateActivitySlug(undefined)).not.toBe(true)
    expect(validateActivitySlug('health-circle')).toBe(true)
  })
})
