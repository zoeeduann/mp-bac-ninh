import type { Media } from '@/payload-types'

export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Preserve an uploaded image's intrinsic ratio when Payload has populated its
 * dimensions. Older records can be missing that metadata, so callers provide
 * a safe fallback instead of rendering a zero-sized image.
 */
export function mediaDimensions(
  media: number | Media | null | undefined,
  fallback: ImageDimensions,
): ImageDimensions {
  if (!media || typeof media === 'number') return fallback

  const width = Number(media.width)
  const height = Number(media.height)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return fallback
  }

  return { width, height }
}
