import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

import { getLocale } from '@/lib/route-locale'

describe('getLocale (route segment)', () => {
  it('returns a supported locale from params', async () => {
    await expect(getLocale(Promise.resolve({ locale: 'zh-CN' }))).resolves.toBe('zh-CN')
    await expect(getLocale(Promise.resolve({ locale: 'en' }))).resolves.toBe('en')
  })

  it('404s on anything else instead of guessing a language', async () => {
    await expect(getLocale(Promise.resolve({ locale: 'vi' }))).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(getLocale(Promise.resolve({ locale: 'bac-ninh' }))).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
