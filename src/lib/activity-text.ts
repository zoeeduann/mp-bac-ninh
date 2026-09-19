/**
 * Display helpers for activity card excerpts and detail-page subtitles.
 *
 * Editors often paste WeChat-style copy into `shortDesc`: emoji, a leading
 * "活动简介：" label, or simply the title again. Cards show a clean two-line
 * excerpt, and nothing at all when the excerpt only repeats the title.
 */

// Emoji and pictographs, plus the invisible joiners/selectors that glue them.
const PICTOGRAPHS = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}︎️‍⃣]/gu

// A leading label such as "活动简介：", "【活动介绍】", "Description:". A bare
// word needs a colon (or brackets) so real sentences like "介绍一种…" survive.
const LABEL_WORD = '(?:活动)?(?:简介|介绍|内容|说明|主题|亮点)'
const LEADING_LABEL = new RegExp(
  `^(?:[【\\[(（]\\s*${LABEL_WORD}\\s*[】\\])）]\\s*[:：]?|${LABEL_WORD}\\s*[:：]|(?:about|description|overview|summary|intro)\\s*[:：])\\s*`,
  'iu',
)

// Bullets, dashes and punctuation left dangling at the start after cleanup.
const LEADING_NOISE = /^[\s·•・\-–—|｜:：、,，.。;；!！?？~～]+/u

function comparable(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
}

/** Strip pictographs and leading label noise; collapse whitespace to one line. */
export function stripExcerptNoise(text: string): string {
  let out = text.replace(PICTOGRAPHS, '').replace(/\s+/g, ' ').trim()
  // Labels can stack ("📌【活动简介】：…"), so peel until stable.
  for (let i = 0; i < 3; i += 1) {
    const next = out.replace(LEADING_NOISE, '').replace(LEADING_LABEL, '').trim()
    if (next === out) break
    out = next
  }
  return out.replace(LEADING_NOISE, '').trim()
}

/**
 * Clean excerpt for a card or subtitle, or null when there is nothing worth
 * showing (empty, or it only repeats the title).
 */
export function activityExcerpt(
  shortDesc: string | null | undefined,
  title: string | null | undefined,
): string | null {
  if (!shortDesc) return null
  let text = stripExcerptNoise(shortDesc)
  const cleanTitle = title ? stripExcerptNoise(title) : ''

  if (cleanTitle && text.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
    text = text.slice(cleanTitle.length).replace(LEADING_NOISE, '').trim()
  }
  if (!text) return null

  const excerptKey = comparable(text)
  const titleKey = comparable(cleanTitle)
  if (!excerptKey) return null
  if (titleKey && (excerptKey === titleKey || titleKey.includes(excerptKey))) return null
  return text
}
