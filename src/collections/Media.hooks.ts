import type { CollectionAfterChangeHook } from 'payload'
import { generateImageAlts, uploadedImageSource } from '../lib/image-alt'
import { syncedUrl } from '../lib/media-url-sync'

/**
 * Repair `media.url` after an upload-REPLACE.
 *
 * Background: Payload v3 + @payloadcms/storage-s3 refreshes `filename`, the
 * thumbnail URL, and every `sizes.*.url` when a media doc's file is replaced,
 * but the top-level `url` keeps pointing at the now-deleted old R2 key. Pages
 * read `url` → 404 → users see broken/stale hero images. This hook closes the
 * gap by re-deriving `url` from the just-updated `filename` after every
 * update and writing it back when stale.
 *
 * Why afterChange (not afterRead): we want the database value to be correct so
 * external consumers (analytics, future migrations, admin list views) see the
 * truth, not a per-request patch.
 *
 * Recursion: the corrective `payload.update` re-enters this hook. The
 * `skipUrlSync` context flag short-circuits the second pass.
 */
export const syncMediaUrlAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'update') return doc
  if ((req as any)?.context?.skipUrlSync) return doc

  const expected = syncedUrl(doc.url, doc.filename)
  if (!expected || expected === doc.url) return doc

  await (req as any).payload.update({
    collection: 'media',
    id: doc.id,
    data: { url: expected },
    context: { skipUrlSync: true },
    overrideAccess: true,
  })

  return doc
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Generate a generic bilingual description immediately after a new image is
 * uploaded. Only empty locale values are filled, so editor-written text is
 * never overwritten.
 */
export const autoGenerateMediaAltAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  if ((req as any)?.context?.skipAutoAlt) return doc
  if (!(req as any)?.file?.data?.length) return doc

  try {
    const [zhDoc, enDoc] = await Promise.all([
      (req as any).payload.findByID({
        collection: 'media',
        id: doc.id,
        locale: 'zh-CN',
        fallbackLocale: false,
        req,
        overrideAccess: true,
      }),
      (req as any).payload.findByID({
        collection: 'media',
        id: doc.id,
        locale: 'en',
        fallbackLocale: false,
        req,
        overrideAccess: true,
      }),
    ])

    const needsZh = !text(zhDoc?.alt)
    const needsEn = !text(enDoc?.alt)
    if (!needsZh && !needsEn) return doc

    const source = await uploadedImageSource((req as any).file.data)
    if (!source) return doc
    const [generated] = await generateImageAlts([{ key: `media-${String(doc.id)}`, source }])
    if (!generated) return doc

    const context = { skipAutoAlt: true, skipIndexNow: true }
    let currentLocaleDoc: unknown
    if (needsZh) {
      const updated = await (req as any).payload.update({
        collection: 'media',
        id: doc.id,
        locale: 'zh-CN',
        data: { alt: generated.zh },
        context,
        req,
        overrideAccess: true,
      })
      if ((req as any).locale === 'zh-CN') currentLocaleDoc = updated
    }
    if (needsEn) {
      const updated = await (req as any).payload.update({
        collection: 'media',
        id: doc.id,
        locale: 'en',
        data: { alt: generated.en },
        context,
        req,
        overrideAccess: true,
      })
      if ((req as any).locale === 'en') currentLocaleDoc = updated
    }

    if (currentLocaleDoc && typeof currentLocaleDoc === 'object') {
      Object.assign(doc, currentLocaleDoc)
    }
  } catch (error) {
    console.error(`[auto-alt] media ${String(doc?.id ?? 'unknown')} failed:`, error)
  }
  return doc
}
