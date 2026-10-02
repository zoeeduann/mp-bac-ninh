import type { Media } from '@/payload-types'
import { isGeneratedCover, mediaCoverJob } from './media-cover-state'

// Bound both dimensions so tall posters do not generate oversized downloads.
// Preserve source artwork in the CMS for future recompositions.
export const activityImageSizes = {
  card: { width: 720, height: 1080, fit: 'inside', withoutEnlargement: true },
  hero: { width: 1600, height: 2400, fit: 'inside' },
} as const

export function activityImageUrl(
  media: Media | number | null | undefined,
  size: 'card' | 'hero' = 'card',
): string | null {
  if (!media || typeof media === 'number') return null
  const job = mediaCoverJob(media.cardCoverJob)
  const cover = media.cardCover
  const artwork = cover && typeof cover === 'object' && job?.sourceFilename === media.filename ? cover
    // Picked straight from the media library: already the finished landscape.
    : isGeneratedCover(media.filename) ? media : null
  if (artwork) {
    return size === 'hero' ? artwork.url || artwork.sizes?.hero?.url || null
      : artwork.sizes?.card?.url || artwork.url || null
  }
  // Source posters are generation inputs, never public image fallbacks.
  return null
}
