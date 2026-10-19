import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/translate', () => ({ translateForSlug: vi.fn(async () => null) }))

import { Activities } from '@/collections/Activities'
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

  it('rejects a blank slug when there is no title to generate one from', () => {
    expect(validateActivitySlug('  ')).not.toBe(true)
    expect(validateActivitySlug('')).not.toBe(true)
    expect(validateActivitySlug(undefined)).not.toBe(true)
    expect(validateActivitySlug('', { title: '   ' })).not.toBe(true)
  })

  it('accepts a hand-typed slug', () => {
    expect(validateActivitySlug('health-circle')).toBe(true)
  })

  it('accepts a blank slug when a title exists, so the admin form can save', () => {
    expect(validateActivitySlug('', { title: '茶会' })).toBe(true)
    expect(validateActivitySlug(undefined, { title: '茶会' })).toBe(true)
  })

  it('wires the validator into the slug field', () => {
    const field = Activities.fields.find((f) => 'name' in f && f.name === 'slug') as {
      required?: boolean
      validate?: (value: unknown, options: unknown) => unknown
    }
    expect(field.required).toBe(true)
    expect(field.validate?.('', { data: { title: '茶会' } })).toBe(true)
    expect(field.validate?.('', { data: {} })).not.toBe(true)
  })

  it('generates from the Chinese title when translation is unavailable', async () => {
    expect(await normalizeActivitySlug('', { title: '正念茶会' })).toBe('正念茶会')
  })

  it('never returns an empty slug for a punctuation-only title', async () => {
    expect(await normalizeActivitySlug('', { title: '!!!' })).toMatch(/^activity-[0-9a-z]+$/)
  })
})
