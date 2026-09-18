import { describe, expect, it } from 'vitest'
import { buildMetadata } from '@/lib/metadata'

const base = {
  title: '善明小院',
  description: '越南北宁的一处安静修学空间',
  url: 'https://mindfulpeacebacninh.com/activities',
  locale: 'zh-CN' as const,
  siteName: '越南北宁善明小院',
}

describe('buildMetadata', () => {
  it('uses the independent location identity', () => {
    const metadata = buildMetadata(base)
    expect(metadata.applicationName).toBe('越南北宁善明小院')
    expect(metadata.openGraph).toMatchObject({ siteName: '越南北宁善明小院' })
  })

  it('falls back to the courtyard photo when a page has no image of its own', () => {
    const metadata = buildMetadata(base)
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
    })
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: ['/og-default.jpg'] })
  })

  it('keeps a page-specific image', () => {
    const metadata = buildMetadata({ ...base, imageUrl: 'https://cdn.example.com/hero.jpg' })
    expect(metadata.openGraph).toMatchObject({ images: [{ url: 'https://cdn.example.com/hero.jpg' }] })
    expect(metadata.twitter).toMatchObject({ images: ['https://cdn.example.com/hero.jpg'] })
  })
})
