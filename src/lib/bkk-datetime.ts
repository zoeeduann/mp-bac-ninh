import { toZonedTime, fromZonedTime, format as fmtTz } from 'date-fns-tz'

const TZ = 'Asia/Bangkok'

/**
 * UTC ISO (Payload's stored value) → "yyyy-MM-ddTHH:mm" string suitable
 * for <input type="datetime-local">, rendered as Bangkok wall-clock time.
 * Returns '' for missing or unparseable input.
 *
 * Pulled into its own file so it can be unit-tested without dragging in
 * @payloadcms/ui (whose transitive CSS imports vitest can't resolve).
 */
export function utcIsoToBkkInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return fmtTz(toZonedTime(d, TZ), "yyyy-MM-dd'T'HH:mm", { timeZone: TZ })
}

/**
 * "yyyy-MM-ddTHH:mm" (interpreted as Bangkok local time) → UTC ISO. Returns
 * null when the input is empty or unparseable so Payload stores null.
 */
export function bkkInputValueToUtcIso(input: string): string | null {
  if (!input) return null
  try {
    const utc = fromZonedTime(input, TZ)
    if (isNaN(utc.getTime())) return null
    return utc.toISOString()
  } catch {
    return null
  }
}
