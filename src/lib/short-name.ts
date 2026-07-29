/**
 * Derive a short display name for an academy.
 * Strips the city prefix and "学堂" / "Academy" suffix.
 *
 * Examples:
 *   shortName('清迈', '清迈心灯学堂')  → '心灯'
 *   shortName('曼谷', '曼谷如如学堂')  → '如如'
 *   shortName('普吉', '普吉和光小院') → '和光小院'
 */
export function shortName(city: string, name: string): string {
  let trimmed = name
  if (trimmed.startsWith(city)) {
    trimmed = trimmed.slice(city.length)
  }
  // Strip leading separators / spaces
  trimmed = trimmed.replace(/^[\s·,\-]+/, '')
  // Strip 学堂 / Academy suffix (with optional parenthetical)
  trimmed = trimmed.replace(/学堂(\(.*\))?$/, '')
  trimmed = trimmed.replace(/\s+Academy(\s*\(.*\))?$/, '')
  return trimmed.trim() || name // fall back to original if everything stripped
}

/**
 * Strip city prefix from academy name but KEEP the 学堂/Academy suffix.
 * Used for h1/card headings where we want the short form with suffix.
 *
 * Examples:
 *   academyName('清迈', '清迈心灯学堂')          → '心灯学堂'
 *   academyName('曼谷', '曼谷如如学堂')           → '如如学堂'
 *   academyName('普吉', '普吉和光小院')           → '和光小院'
 *   academyName('Chiang Mai', 'Chiang Mai Xindeng Academy') → 'Xindeng Academy'
 *   academyName('Bangkok', 'Heartland Zen Academy')         → 'Heartland Zen Academy' (city not a prefix)
 */
export function academyName(city: string, name: string): string {
  let trimmed = name
  if (trimmed.startsWith(city)) {
    trimmed = trimmed.slice(city.length).replace(/^[\s·,\-]+/, '')
  }
  // If result starts with 学堂 or Academy (i.e., just the suffix survived), fall back
  if (/^(学堂|\s*Academy)/.test(trimmed)) {
    return name
  }
  return trimmed.trim() || name
}
