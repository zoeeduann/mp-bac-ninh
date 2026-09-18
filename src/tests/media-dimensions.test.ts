import { describe, expect, it } from 'vitest'

import { mediaDimensions } from '@/lib/media-dimensions'
import type { Media } from '@/payload-types'

const fallback = { width: 1200, height: 800 }

describe('mediaDimensions', () => {
  it('uses Payload dimensions so the original image ratio is preserved', () => {
    const media = { width: 960, height: 1280 } as Media

    expect(mediaDimensions(media, fallback)).toEqual({ width: 960, height: 1280 })
  })

  it('falls back for unresolved or incomplete media records', () => {
    expect(mediaDimensions(42, fallback)).toEqual(fallback)
    expect(mediaDimensions({ width: 960, height: null } as Media, fallback)).toEqual(fallback)
    expect(mediaDimensions({ width: 0, height: 1280 } as Media, fallback)).toEqual(fallback)
  })
})
