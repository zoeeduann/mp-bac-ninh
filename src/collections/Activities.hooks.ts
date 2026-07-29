/**
 * Standalone hook functions for the Activities collection.
 * Extracted here so they can be unit-tested without importing the full
 * Payload config object.
 */

import { translateText, translateRichText } from '../lib/translate'
import { notifyIndexNowForActivity } from '../lib/indexnow-content'

/**
 * Publish-time validator.
 *
 * Policy (relaxed from the original "both locales required" rule):
 *   - To publish, the zh-CN `title` and `shortDesc` MUST be non-empty.
 *   - The en locale is left to the auto-translator (afterChange hook) to fill
 *     in the background. If the translator fails or the API key is missing,
 *     the page falls back to displaying the zh-CN value for English visitors.
 *
 * Why ZH and not EN: the team writes content in Chinese and the audience is
 * predominantly Chinese-speaking; English is a courtesy fallback, not the
 * source of truth.
 */
export async function activitiesBeforeValidate({
  data,
  originalDoc,
  req,
}: {
  data: unknown
  originalDoc?: Record<string, any> | null
  req: any
}): Promise<unknown> {
  const incomingStatus = (data as any)?.status ?? originalDoc?.status
  if (incomingStatus !== 'published') return data

  const currentLocale = (req as any)?.locale ?? 'zh-CN'
  const id = (data as any)?.id ?? originalDoc?.id

  let zhTitle: unknown
  let zhShort: unknown

  if (currentLocale === 'zh-CN') {
    // Current submission is in zh-CN: prefer just-submitted over stored.
    zhTitle = (data as any)?.title ?? originalDoc?.title
    zhShort = (data as any)?.shortDesc ?? originalDoc?.shortDesc
  } else if (id) {
    // Cross-locale publish (editor is in en, doc already exists): fetch zh-CN.
    const zh = await req.payload.findByID({
      collection: 'activities',
      id,
      locale: 'zh-CN',
      overrideAccess: true,
    })
    zhTitle = zh?.title
    zhShort = zh?.shortDesc
  }
  // Creating in en with no zh-CN row yet: both stay undefined → throws below.

  const missing: string[] = []
  if (!zhTitle) missing.push('标题')
  if (!zhShort) missing.push('简介')

  if (missing.length) {
    throw new Error(`发布需要先填写中文 ${missing.join('、')}。`)
  }
  return data
}

/**
 * Occurrence soft-delete enforcement (spec §6.1):
 * If an admin removes an occurrence row from the array UI, we re-insert
 * it with status='deleted' instead of allowing hard deletion. This
 * preserves reservation references.
 */
export async function activitiesBeforeChange({
  data,
  originalDoc,
}: {
  data: unknown
  originalDoc?: Record<string, any> | null
}): Promise<unknown> {
  if (!originalDoc?.occurrences?.length) return data

  const newOccs: any[] = (data as any)?.occurrences ?? []
  const newIds = new Set(newOccs.map((o: any) => o.id).filter(Boolean))

  const removed = originalDoc.occurrences.filter((o: any) => o.id && !newIds.has(o.id))

  if (removed.length > 0) {
    ;(data as any).occurrences = [
      ...newOccs,
      ...removed.map((o: any) => ({ ...o, status: 'deleted' })),
    ]
  }
  return data
}

/**
 * Auto-translate zh-CN → en for activities whose `status` is `published`.
 *
 * Triggers on every save while status=published (not just the draft→published
 * edge). The per-field "skip if en already has content" check keeps this
 * idempotent in the steady state, and lets the hook self-heal when an
 * activity was published BEFORE the auto-translator code or its API key
 * went live — the editor's next save fills the gap without needing a
 * draft→published toggle.
 *
 * Looks up both locales explicitly so we don't trust `doc.title` (whose
 * language depends on whatever locale the editor was working in).
 *
 * Each per-field translator call is wrapped in try/catch — a Claude API
 * failure on one field doesn't take down the others and never rolls back
 * the parent save.
 *
 * Recursion: the corrective `payload.update({ locale: 'en' })` re-enters
 * this hook. It short-circuits via the `skipAutoTranslate` context flag,
 * and would also no-op on the next pass because every EN field is now
 * filled (idempotency takes over).
 */
/** Hard budget for the entire translation flow. Well under Vercel's 60s
 * function ceiling but generous for a few Claude API calls plus the
 * corrective payload.update. If we blow this, save proceeds with EN empty
 * (current fallback: site renders ZH for EN visitors, which is fine). */
const AUTO_TRANSLATE_BUDGET_MS = 12_000

export async function activitiesAutoTranslate({
  doc,
  req,
  previousDoc: _previousDoc,
  operation: _operation,
}: {
  doc: any
  previousDoc?: any
  req: any
  operation?: 'create' | 'update'
}): Promise<any> {
  // console.log is reliably captured by Vercel; Payload's logger may be
  // configured to a level that swallows info-level lines in production.
  console.log(
    `[auto-translate] hook fired status=${doc?.status} id=${doc?.id} skipFlag=${Boolean(req?.context?.skipAutoTranslate)} hasKey=${Boolean(process.env.ANTHROPIC_API_KEY)}`,
  )

  if (req?.context?.skipAutoTranslate) return doc
  if (doc?.status !== 'published') return doc

  const id = doc?.id
  if (!id) return doc

  // Wrap the flow in a race with a hard timeout so the editor's Save never
  // hangs on a slow Claude call or a stuck nested payload.update.
  try {
    await Promise.race([
      runAutoTranslate(doc, req, id),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`budget ${AUTO_TRANSLATE_BUDGET_MS}ms exceeded`)),
          AUTO_TRANSLATE_BUDGET_MS,
        ),
      ),
    ])
  } catch (e) {
    console.error(`[auto-translate] aborted for activity ${id}:`, e)
  }
  return doc
}

async function runAutoTranslate(doc: any, req: any, id: any): Promise<void> {
  let zhDoc: any
  let enDoc: any
  try {
    ;[zhDoc, enDoc] = await Promise.all([
      req.payload.findByID({
        collection: 'activities',
        id,
        locale: 'zh-CN',
        overrideAccess: true,
      }),
      req.payload.findByID({
        collection: 'activities',
        id,
        locale: 'en',
        // CRITICAL: project's localization config has `fallback: true`, so
        // an EN findByID would silently return zh-CN content for any empty
        // EN field. That makes `!enDoc.title` always false → every field
        // skipped → the hook returns with an empty enUpdate and the EN
        // locale row is never created. Disable fallback to see the true
        // (possibly empty) EN values.
        fallbackLocale: false,
        overrideAccess: true,
      }),
    ])
  } catch (e) {
    console.error(`[auto-translate] findByID failed for activity ${id}:`, e)
    return
  }

  console.log(
    `[auto-translate] fetched docs id=${id} zhTitleLen=${(zhDoc?.title ?? '').length} zhShortLen=${(zhDoc?.shortDesc ?? '').length} zhHasDesc=${Boolean(zhDoc?.description)} enTitleLen=${(enDoc?.title ?? '').length} enShortLen=${(enDoc?.shortDesc ?? '').length} enHasDesc=${Boolean(enDoc?.description)}`,
  )

  const enUpdate: Record<string, unknown> = {}

  if (!enDoc?.title && zhDoc?.title) {
    try {
      const t = await translateText(zhDoc.title)
      console.log(
        `[auto-translate] title translateText result id=${id} resultLen=${(t ?? '').length}`,
      )
      if (t) enUpdate.title = t
    } catch (e) {
      console.error(`[auto-translate] title failed for activity ${id}:`, e)
    }
  }
  if (!enDoc?.shortDesc && zhDoc?.shortDesc) {
    try {
      // shortDesc has maxLength: 240 on the Activities schema; an unbounded
      // translation routinely runs longer than the source Chinese (less dense
      // information per character in English) and would fail Payload
      // validation. Bound the request and rely on translate.ts to also
      // truncate defensively.
      const t = await translateText(zhDoc.shortDesc, { maxChars: 240 })
      console.log(
        `[auto-translate] shortDesc translateText result id=${id} resultLen=${(t ?? '').length}`,
      )
      if (t) enUpdate.shortDesc = t
    } catch (e) {
      console.error(`[auto-translate] shortDesc failed for activity ${id}:`, e)
    }
  }
  if (!enDoc?.description && zhDoc?.description) {
    try {
      const t = await translateRichText(zhDoc.description)
      console.log(`[auto-translate] description translateRichText result id=${id} ok=${Boolean(t)}`)
      if (t) enUpdate.description = t
    } catch (e) {
      console.error(`[auto-translate] description failed for activity ${id}:`, e)
    }
  }

  console.log(
    `[auto-translate] enUpdate keys id=${id} keys=${JSON.stringify(Object.keys(enUpdate))}`,
  )

  if (Object.keys(enUpdate).length === 0) return

  try {
    await req.payload.update({
      collection: 'activities',
      id,
      locale: 'en',
      data: enUpdate,
      overrideAccess: true,
      context: { skipAutoTranslate: true },
    })
    console.log(`[auto-translate] persist en OK id=${id}`)
  } catch (e) {
    console.error(`[auto-translate] persist en failed for activity ${id}:`, e)
  }
}

export async function activitiesIndexNow({
  doc,
  previousDoc,
  req,
}: {
  doc: any
  previousDoc?: any
  req: any
}): Promise<any> {
  try {
    await notifyIndexNowForActivity({ doc, previousDoc, req })
  } catch (e) {
    console.error(`[indexnow] activity hook failed for ${doc?.id ?? 'unknown'}:`, e)
  }
  return doc
}

export async function activitiesDeletedIndexNow({
  doc,
  req,
}: {
  doc: any
  req: any
}): Promise<any> {
  try {
    await notifyIndexNowForActivity({ doc, req })
  } catch (e) {
    console.error(`[indexnow] deleted activity hook failed for ${doc?.id ?? 'unknown'}:`, e)
  }
  return doc
}
