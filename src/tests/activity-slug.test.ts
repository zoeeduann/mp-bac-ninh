import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/translate', () => ({ translateForSlug: vi.fn(async () => null) }))

import { normalizeActivitySlug, validateActivitySlug } from '@/collections/activity-slug'

describe('activity slug', () => {
  it('trims a typed slug', async () => {
    expect(await normalizeActivitySlug('  mindfulness-ball ', { title: '正念球' })).toBe(
      'mindfulness-ball',
    )
  })

  it('normalizes a hand-typed slug with spaces, colons and capitals', async () => {
    expect(
      await normalizeActivitySlug('Preparatory Course: Family Education', { title: '预备课程' }),
    ).toBe('preparatory-course-family-education')
    expect(await normalizeActivitySlug('Chan-Tea', { title: '禅茶' })).toBe('chan-tea')
  })

  it('regenerates from the title when a typed slug has nothing usable', async () => {
    const translate = vi.fn(async () => 'Tea Gathering')
    expect(await normalizeActivitySlug(' :: ', { title: '茶会' }, translate)).toBe('tea-gathering')
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
