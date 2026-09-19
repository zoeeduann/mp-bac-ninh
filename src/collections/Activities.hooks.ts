/**
 * Standalone hook functions for the Activities collection.
 * Extracted here so they can be unit-tested without importing the full
 * Payload config object.
 */

import { after } from 'next/server'
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
/** Hard budget for the entire translation flow. It runs after the response,
 * so it no longer delays the editor's Save; it only has to stay under the
 * function's 60s ceiling. If it runs out, the activity stays Chinese-only
 * (the English site then leaves it out) until its next save. */
const AUTO_TRANSLATE_BUDGET_MS = 45_000

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

  // Translate after the save has committed. afterChange runs inside the
  // save's transaction, so for an activity published on its first save the
  // lookups below (made outside that transaction) used to find nothing and
  // the activity never got an English version. Running after the response
  // also means the editor's Save never waits on Claude.
  const payload = req.payload
  const run = async () => {
    try {
      await Promise.race([
        runAutoTranslate(doc, { payload }, id),
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
  }
  if (!scheduleAfterResponse(run)) await run()
  return doc
}

/**
 * Run `task` once the current request's response is sent and its database
 * transaction committed (Next.js `after`, kept alive by the platform).
 * Returns false outside a request (seed scripts, tests); the caller then
 * runs the task inline.
 */
export function scheduleAfterResponse(task: () => Promise<void>): boolean {
  try {
    after(task)
    return true
  } catch {
    return false
  }
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

  // The three fields are translated in parallel so a long description does
  // not push the whole flow past AUTO_TRANSLATE_BUDGET_MS.
  await Promise.all([
    (async () => {
      if (enDoc?.title || !zhDoc?.title) return
      try {
        const t = await translateText(zhDoc.title)
        console.log(
          `[auto-translate] title translateText result id=${id} resultLen=${(t ?? '').length}`,
        )
        if (t) enUpdate.title = t
      } catch (e) {
        console.error(`[auto-translate] title failed for activity ${id}:`, e)
      }
    })(),
    (async () => {
      if (enDoc?.shortDesc || !zhDoc?.shortDesc) return
      try {
        // shortDesc has maxLength: 240 on the Activities schema; an unbounded
        // translation routinely runs longer than the source Chinese (less
        // dense information per character in English) and would fail Payload
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
    })(),
    (async () => {
      if (enDoc?.description || !zhDoc?.description) return
      try {
        const t = await translateRichText(zhDoc.description)
        console.log(`[auto-translate] description translateRichText result id=${id} ok=${Boolean(t)}`)
        if (t) enUpdate.description = t
      } catch (e) {
        console.error(`[auto-translate] description failed for activity ${id}:`, e)
      }
    })(),
  ])

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
