import type { Locale } from './i18n'
import { locationPath } from './site-config'

/**
 * Sanitised file name for a downloaded activity poster PNG.
 * Strips characters file systems reject and falls back to "activity" when
 * the slug is missing entirely.
 */
export function posterFilename(slug: string | null | undefined): string {
  const safe = (slug || '')
    .replace(/[\\/:*?"<>|]+/g, '-') // file-system-hostile chars
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${safe || 'activity'}-poster.png`
}

/**
 * Build the URL that the poster's QR code encodes.
 *
 * Prefers the booking page with `?activity=...&occ=...&src=poster` so that
 * scanning the poster lands the visitor straight on the booking modal for the
 * specific session being promoted (UpcomingSessionsList auto-opens it). Falls
 * back to the activity detail page when there's no future occurrence to point
 * at (the poster has been kept around past the event, or the session ID is
 * missing for some reason).
 */
export function buildPosterQrTarget(opts: {
  base: string
  locSlug: string
  activitySlug: string
  occurrenceId: string | null | undefined
  locale: Locale
}): string {
  const { base, locSlug, activitySlug, occurrenceId, locale } = opts
  const at = (suffix: string) => `${base}${locationPath(locale, locSlug, suffix)}`
  if (occurrenceId) {
    const params = new URLSearchParams({
      activity: activitySlug,
      occ: occurrenceId,
      src: 'poster',
    })
    return `${at('/book')}?${params.toString()}`
  }
  return at(`/activities/${activitySlug}`)
}
