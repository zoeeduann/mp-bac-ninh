/**
 * Return `url` with its last path segment replaced by the URL-encoded
 * `filename`. Used to repair stale `media.url` values written by Payload v3 +
 * s3Storage on upload-REPLACE: the storage plugin refreshes filename and every
 * size-variant URL, but leaves the top-level `url` pointing at the old (now
 * deleted) R2 key. Self-healing: derives the R2 base from the stale URL itself,
 * so no env / config coupling.
 *
 * No-op when either input is missing or when `url` has no path separator
 * (returns the input unchanged so callers can pipeline safely).
 */
export function syncedUrl(
  url: string | null | undefined,
  filename: string | null | undefined,
): string | null | undefined {
  if (!url || !filename) return url
  const lastSlash = url.lastIndexOf('/')
  if (lastSlash < 0) return url
  return url.slice(0, lastSlash + 1) + encodeURIComponent(filename)
}
