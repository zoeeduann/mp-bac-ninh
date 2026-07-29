import type { CollectionAfterChangeHook } from 'payload'
import {
  generateImageAlts,
  publicImageUrl,
  type AltImageInput,
  type GeneratedImageAlt,
} from '../lib/image-alt'
import { collectTextLeaves } from '../lib/translate'

type MediaLike = {
  id?: number | string
  url?: string | null
  sizes?: { card?: { url?: string | null } | null } | null
}

type PhotoLike = {
  id?: string | null
  image?: number | string | MediaLike | null
  caption?: string | null
  alt?: string | null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function relationshipId(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const id = (value as MediaLike).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

function mediaUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const media = value as MediaLike
  return publicImageUrl(media.sizes?.card?.url) || publicImageUrl(media.url)
}

function photoKey(photo: PhotoLike, index: number): string {
  return `photo-${photo.id || relationshipId(photo.image) || index + 1}`
}

function articleContext(doc: any): string {
  const body = collectTextLeaves(doc?.body?.root).filter(Boolean).join(' ').slice(0, 1_600)
  return [`文章标题：${text(doc?.title)}`, body ? `文章内容：${body}` : '']
    .filter(Boolean)
    .join('\n')
}

function hasRequiredLocalizedFields(doc: any): boolean {
  return Boolean(doc && text(doc.title))
}

function localizedPhoto(
  photos: PhotoLike[] | null | undefined,
  source: PhotoLike,
  index: number,
): PhotoLike | undefined {
  if (!Array.isArray(photos)) return undefined
  if (source.id) {
    const byId = photos.find((photo) => photo.id === source.id)
    if (byId) return byId
  }
  return photos[index]
}

function serializePhotos(
  photos: PhotoLike[],
  generated: Map<string, GeneratedImageAlt>,
  locale: 'zh-CN' | 'en',
): PhotoLike[] {
  return photos.map((photo, index) => {
    const result = generated.get(photoKey(photo, index))
    return {
      ...photo,
      image: relationshipId(photo.image),
      alt: text(photo.alt) || (locale === 'zh-CN' ? result?.zh : result?.en) || undefined,
    }
  })
}

async function findLocalizedJournal(req: any, id: number | string, locale: 'zh-CN' | 'en') {
  try {
    return await req.payload.findByID({
      collection: 'journal',
      id,
      locale,
      fallbackLocale: false,
      depth: 2,
      req,
      overrideAccess: true,
    })
  } catch (error) {
    req.payload?.logger?.warn?.(
      `[auto-alt] journal ${String(id)} ${locale} lookup skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
    return null
  }
}

/**
 * Fill article-specific image descriptions from both the image and journal
 * context. Existing values are preserved, making the generated result a
 * suggestion that editors always retain control over.
 */
export const autoGenerateJournalAltAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  if ((req as any)?.context?.skipAutoAlt) return doc
  if (!doc?.id) return doc

  try {
    const [zhDoc, enDoc] = await Promise.all([
      findLocalizedJournal(req, doc.id, 'zh-CN'),
      findLocalizedJournal(req, doc.id, 'en'),
    ])
    if (!zhDoc && !enDoc) return doc

    const inputs: AltImageInput[] = []
    const canUpdateZh = hasRequiredLocalizedFields(zhDoc)
    const canUpdateEn = hasRequiredLocalizedFields(enDoc)
    const coverNeedsAlt =
      Boolean(canUpdateZh && !text(zhDoc.coverAlt)) || Boolean(canUpdateEn && !text(enDoc.coverAlt))
    const coverUrl = mediaUrl(zhDoc?.coverImage) || mediaUrl(enDoc?.coverImage)
    if (coverNeedsAlt && coverUrl) {
      inputs.push({ key: 'cover', source: { type: 'url', url: coverUrl } })
    }

    const zhPhotos = Array.isArray(zhDoc?.photos) ? (zhDoc.photos as PhotoLike[]) : []
    const enPhotos = Array.isArray(enDoc?.photos) ? (enDoc.photos as PhotoLike[]) : []
    const sourcePhotos = zhPhotos.length > 0 ? zhPhotos : enPhotos
    for (const [index, photo] of sourcePhotos.entries()) {
      const zhPhoto = zhDoc ? localizedPhoto(zhPhotos, photo, index) : undefined
      const enPhoto = enDoc ? localizedPhoto(enPhotos, photo, index) : undefined
      const needsZh = Boolean(canUpdateZh && !text(zhPhoto?.alt))
      const needsEn = Boolean(canUpdateEn && !text(enPhoto?.alt))
      if (!needsZh && !needsEn) continue
      const url = mediaUrl(photo.image)
      if (!url) continue
      inputs.push({
        key: photoKey(photo, index),
        caption: zhPhoto?.caption || enPhoto?.caption || photo.caption,
        source: { type: 'url', url },
      })
    }

    if (inputs.length === 0) return doc
    const results = await generateImageAlts(inputs, articleContext(zhDoc || enDoc))
    if (results.length === 0) return doc
    const generated = new Map(results.map((result) => [result.key, result]))

    const zhUpdate: Record<string, unknown> = {}
    const enUpdate: Record<string, unknown> = {}
    const coverResult = generated.get('cover')
    if (coverResult) {
      if (canUpdateZh && !text(zhDoc.coverAlt)) zhUpdate.coverAlt = coverResult.zh
      if (canUpdateEn && !text(enDoc.coverAlt)) enUpdate.coverAlt = coverResult.en
    }

    if (results.some((result) => result.key.startsWith('photo-'))) {
      if (canUpdateZh && zhPhotos.some((photo) => !text(photo.alt))) {
        zhUpdate.photos = serializePhotos(zhPhotos, generated, 'zh-CN')
      }
      if (
        canUpdateEn &&
        sourcePhotos.some((photo, index) => {
          const enPhoto = localizedPhoto(enPhotos, photo, index)
          return !text(enPhoto?.alt)
        })
      ) {
        const photosForEnglish = sourcePhotos.map((photo, index) => {
          const enPhoto = localizedPhoto(enPhotos, photo, index)
          return {
            ...photo,
            caption: enPhoto?.caption,
            alt: enPhoto?.alt,
          }
        })
        enUpdate.photos = serializePhotos(photosForEnglish, generated, 'en')
      }
    }

    const context = { skipAutoAlt: true, skipIndexNow: true }
    let currentLocaleDoc: unknown
    if (Object.keys(zhUpdate).length > 0) {
      const updated = await (req as any).payload.update({
        collection: 'journal',
        id: doc.id,
        locale: 'zh-CN',
        data: zhUpdate,
        context,
        req,
        overrideAccess: true,
      })
      if ((req as any).locale === 'zh-CN') currentLocaleDoc = updated
    }
    if (Object.keys(enUpdate).length > 0) {
      const updated = await (req as any).payload.update({
        collection: 'journal',
        id: doc.id,
        locale: 'en',
        data: enUpdate,
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
    console.error(`[auto-alt] journal ${String(doc?.id ?? 'unknown')} failed:`, error)
  }
  return doc
}
