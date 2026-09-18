import type { Media } from '@/payload-types'
import { mediaCoverJob } from './media-cover-state'

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
  if (cover && typeof cover === 'object'
    && job?.sourceFilename === media.filename) {
    return size === 'hero' ? cover.url || cover.sizes?.hero?.url || null
      : cover.sizes?.card?.url || cover.url || null
  }
  // Source posters are generation inputs, never public image fallbacks.
  return null
}
