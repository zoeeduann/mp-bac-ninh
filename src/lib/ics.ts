/**
 * Build an iCalendar VEVENT block compliant with RFC 5545.
 * All dates are emitted as UTC (Z-suffixed) so any client renders them
 * correctly in the viewer's local timezone.
 */

export interface IcsEvent {
  uid: string              // unique per reservation+occurrence
  startUtc: Date
  endUtc: Date
  summary: string          // activity title
  description?: string     // includes session info + location + notes
  locationName?: string    // academy name + address
  organizerEmail?: string  // adminEmail from Settings
  productName?: string     // local academy brand used in PRODID
  timeZone?: string        // informational local timezone for calendar clients
}

/** Format a Date as iCal UTC string: YYYYMMDDTHHMMSSZ */
function fmtUtc(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  )
}

/** Escape special characters in iCal TEXT values per RFC 5545 §3.3.11 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/**
 * RFC 5545 line folding: lines > 75 octets must be folded by inserting
 * CRLF + a single space (LWSP) before the continuation content.
 * The 75-octet limit counts the first line including property name.
 */
function foldLine(line: string): string {
  const limit = 75
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= limit) return line
  const parts: string[] = []
  let current = ''
  let contentLimit = limit
  for (const character of line) {
    if (current && encoder.encode(current + character).length > contentLimit) {
      parts.push(parts.length === 0 ? current : ` ${current}`)
      current = character
      // Continuation lines reserve one octet for their leading space.
      contentLimit = limit - 1
    } else {
      current += character
    }
  }
  if (current) parts.push(parts.length === 0 ? current : ` ${current}`)
  return parts.join('\r\n')
}

function prop(name: string, value: string): string {
  return foldLine(`${name}:${value}`)
}

export function buildIcs(ev: IcsEvent): string {
  const now = fmtUtc(new Date())
  const productName = (ev.productName || 'Local Academy').replace(/[\/]/g, '-')
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    prop('PRODID', escapeText(`-//${productName}//Booking//EN`)),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(ev.timeZone ? [prop('X-WR-TIMEZONE', escapeText(ev.timeZone))] : []),
    'BEGIN:VEVENT',
    prop('UID', escapeText(ev.uid)),
    prop('DTSTAMP', now),
    prop('DTSTART', fmtUtc(ev.startUtc)),
    prop('DTEND', fmtUtc(ev.endUtc)),
    prop('SUMMARY', escapeText(ev.summary)),
  ]

  if (ev.description) {
    lines.push(prop('DESCRIPTION', escapeText(ev.description)))
  }
  if (ev.locationName) {
    lines.push(prop('LOCATION', escapeText(ev.locationName)))
  }
  if (ev.organizerEmail) {
    lines.push(prop('ORGANIZER', `mailto:${ev.organizerEmail}`))
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // RFC 5545 requires CRLF line endings
  return lines.join('\r\n') + '\r\n'
}
