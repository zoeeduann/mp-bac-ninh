import { slugify } from '../lib/slugify'
import { translateForSlug } from '../lib/translate'

type Translate = (zhTitle: string) => Promise<string | null>

/**
 * Normalise the activity slug before validation. Hand-typed slugs go through
 * slugify, so spaces, colons and capitals never reach a public URL. A value
 * that is blank after trimming (e.g. "  ", which produced the broken
 * `/activities/  ` link) is treated as empty and regenerated from the title.
 */
export async function normalizeActivitySlug(
  value: unknown,
  data: unknown,
  translate: Translate = translateForSlug,
): Promise<string> {
  const typed = typeof value === 'string' ? slugify(value) : ''
  if (typed) return typed
  const zhTitle = (data as { title?: unknown } | undefined)?.title
  const title = typeof zhTitle === 'string' ? zhTitle.trim() : ''
  if (!title) return ''
  // Translate the Chinese title to English via Claude (using the brand
  // glossary so academy names stay pinyin), then slugify. Bound to 8s so a
  // slow API call can't hold up the save; fall back to slugifying the
  // Chinese title directly if Claude is unavailable or times out.
  let enTitle: string | null = null
  try {
    enTitle = await Promise.race([
      translate(title),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
    ])
  } catch {
    // swallow — fall through to plain slugify(title)
  }
  // Never return '' while a title exists: a punctuation-only title slugifies
  // to nothing, so fall back to a unique placeholder instead.
  return slugify(enTitle || '') || slugify(title) || `activity-${Date.now().toString(36)}`
}

/**
 * Accept a blank slug when there is a title to generate one from. Payload's
 * admin form validates fields before the beforeValidate hook runs, so the old
 * "slug must be non-blank" check blocked saving with the slug left empty even
 * though normalizeActivitySlug would have filled it in on the server.
 */
export function validateActivitySlug(value: unknown, data?: unknown): true | string {
  if (typeof value === 'string' && value.trim().length > 0) return true
  const title = (data as { title?: unknown } | undefined)?.title
  if (typeof title === 'string' && title.trim().length > 0) return true
  return '请填写 slug,或先填写标题以自动生成 / Enter a slug, or a title to generate one'
}
