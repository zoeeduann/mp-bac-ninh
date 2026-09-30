// @vitest-environment node
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { activityImageSizes, activityImageUrl } from '@/lib/activity-image'
import type { Media } from '@/payload-types'

describe('activity image derivatives', () => {
  it.each([[1200, 2400], [2400, 1200], [240, 360]])(
    'keeps the entire %i × %i image without stretching or upscaling',
    async (width, height) => {
      // Distinct top/bottom borders detect the original poster cropping bug.
      const input = await sharp({ create: { width, height, channels: 3, background: 'white' } })
        .composite([
          { input: Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height / 10}" fill="red"/><rect y="${height * 0.9}" width="${width}" height="${height / 10}" fill="blue"/></svg>`), top: 0, left: 0 },
        ]).png().toBuffer()
      const { data, info } = await sharp(input).resize(activityImageSizes.card).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      expect(info.width).toBeLessThanOrEqual(Math.min(width, 720))
      expect(info.height).toBeLessThanOrEqual(Math.min(height, 1080))
      expect(info.width / info.height).toBeCloseTo(width / height, 2)
      const top = Math.floor(info.width / 2) * info.channels
      const bottom = ((info.height - 1) * info.width + Math.floor(info.width / 2)) * info.channels
      expect([...data.subarray(top, top + 3)]).toEqual([255, 0, 0])
      expect([...data.subarray(bottom, bottom + 3)]).toEqual([0, 0, 255])
    },
  )
})

describe('activityImageUrl', () => {
  const source = {
    url: '/original.webp', filename: 'original.webp', width: 1200, height: 1800,
    sizes: { card: { url: '/original-card.webp' }, hero: { url: '/original-hero.webp' } },
  } as Media
  const withCover = {
    ...source,
    cardCover: {
      url: '/landscape.webp',
      sizes: { card: { url: '/landscape-card.webp' }, hero: { url: '/landscape-hero.webp' } },
    } as Media,
    cardCoverJob: { token: 't', sourceFilename: 'original.webp', status: 'ready', requestedAt: new Date().toISOString() },
  }

  it.each(['card', 'hero'] as const)('never exposes the source when a %s cover is missing or stale', (size) => {
    expect(activityImageUrl(source, size)).toBeNull()
    expect(activityImageUrl(12, size)).toBeNull()
    expect(activityImageUrl(null, size)).toBeNull()
    expect(activityImageUrl({ ...withCover, cardCover: 99 }, size)).toBeNull()
    expect(activityImageUrl({ ...withCover, filename: 'replacement.webp' }, size)).toBeNull()
    expect(activityImageUrl({ ...withCover, cardCover: {} as Media }, size)).toBeNull()
  })

  it('selects the generated derivative for both cards and detail/share heroes', () => {
    expect(activityImageUrl(withCover)).toBe('/landscape-card.webp')
    expect(activityImageUrl(withCover, 'hero')).toBe('/landscape.webp')
    expect(activityImageUrl({ ...withCover, cardCover: { url: '/landscape.webp' } as Media }, 'hero')).toBe('/landscape.webp')
  })

  it('shows a generated cover that an editor picked directly from the media library', () => {
    const picked = {
      url: '/cover.webp', filename: 'cover-302-c37c0662-f0cc-49b3-99ee-62875f9ee179.webp', width: 1536, height: 1024,
      sizes: { card: { url: '/cover-card.webp' }, hero: { url: '/cover-hero.webp' } },
    } as Media
    expect(activityImageUrl(picked)).toBe('/cover-card.webp')
    expect(activityImageUrl(picked, 'hero')).toBe('/cover.webp')
    // A replaced file loses the generated name and is a source poster again.
    expect(activityImageUrl({ ...picked, filename: 'cover-302.webp' })).toBeNull()
    expect(activityImageUrl({ ...picked, filename: 'poster-cover-302-c37c0662-f0cc-49b3-99ee-62875f9ee179.webp' })).toBeNull()
  })

  it('keeps a previously generated cover available when regeneration fails', () => {
    expect(activityImageUrl({ ...withCover, cardCoverJob: { ...withCover.cardCoverJob, status: 'failed' } }, 'hero')).toBe('/landscape.webp')
  })
})
