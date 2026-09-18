import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'
import { autoGenerateMediaAltAfterChange, syncMediaUrlAfterChange } from './Media.hooks'
import { activityImageSizes } from '../lib/activity-image'
import { prepareMediaCover, scheduleMediaCover } from './Media.cover-hooks'

// Rewrites Payload's default /api/media/file/<name> URLs to the R2 public
// hostname when S3_PUBLIC_HOSTNAME is set. Two reasons we do this here
// rather than rely on the storage-s3 plugin's default:
//
//   1. The plugin's static handler serves GET but returns 404 on HEAD
//      requests. Next.js /_next/image probes with HEAD before optimising,
//      so the entire site rendered as broken images.
//   2. Going direct to R2 cuts a Vercel function hop and lets Cloudflare's
//      R2 CDN serve images.
//
// No-op when S3_PUBLIC_HOSTNAME is unset (e.g., local dev with disk storage).
function rewriteToR2(value: string | undefined | null): string | undefined | null {
  const host = process.env.S3_PUBLIC_HOSTNAME
  if (!host || !value) return value
  return value.replace(/^https?:\/\/[^/]+\/api\/media\/file\//, `https://${host}/`)
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { zh: '媒体', en: 'Media' },
    plural: { zh: '媒体', en: 'Media' },
  },
  admin: { components: { beforeList: ['@/components/admin/MediaCoverBatch'] } },
  hooks: {
    beforeChange: [prepareMediaCover],
    afterRead: [
      ({ doc }) => {
        if (!doc) return doc
        doc.url = rewriteToR2(doc.url)
        doc.thumbnailURL = rewriteToR2(doc.thumbnailURL)
        if (doc.sizes && typeof doc.sizes === 'object') {
          for (const size of Object.values(doc.sizes) as Array<{ url?: string | null }>) {
            if (size && size.url) size.url = rewriteToR2(size.url) ?? undefined
          }
        }
        return doc
      },
    ],
    // Heal stale `url` after upload-REPLACE — see Media.hooks.ts for context.
    afterChange: [
      // Schedule before alt generation: its nested local updates mutate
      // req.context with skipAutoAlt, which would suppress this upload's job.
      scheduleMediaCover,
      syncMediaUrlAfterChange,
      autoGenerateMediaAltAfterChange,
    ],
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      // Backend browsing only; no separate AI generation.
      { name: 'thumbnail', width: 240, height: 240, fit: 'cover' },
      // Full artwork at bounded sizes, with no cropping or upscaling.
      { name: 'card', ...activityImageSizes.card },
      { name: 'hero', ...activityImageSizes.hero },
      // Share previews are composed per activity, not cropped per upload.
    ],
    formatOptions: { format: 'webp', options: { quality: 82 } },
    adminThumbnail: 'thumbnail',
  },
  access: {
    read: () => true,
    create: isAdminOrStaff,
    update: isAdminOrStaff,
    delete: isAdminOrStaff,
  },
  fields: [
    {
      name: 'cardCover',
      type: 'upload',
      relationTo: 'media',
      label: { zh: '横版封面', en: 'Landscape cover' },
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'cardCoverJob',
      type: 'json',
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'coverGenerator',
      type: 'ui',
      admin: { components: { Field: '@/components/admin/MediaCoverGenerator' } },
    },
    {
      name: 'alt',
      type: 'text',
      label: { zh: '图片内容说明（自动生成）', en: 'Image description (auto-generated)' },
      localized: true,
      admin: {
        description: {
          zh: '上传后由 AI 自动描述图片，供无障碍阅读和搜索引擎理解。可以修改；人工内容不会被覆盖。',
          en: 'AI-generated after upload for accessibility and search. You can edit it; manual text is never overwritten.',
        },
        placeholder: {
          zh: '留空即可自动生成，例如：学员在庭院中练习静坐',
          en: 'Leave blank to generate automatically',
        },
      },
    },
    {
      name: 'seedKey',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        hidden: true,
        description: 'Internal: used by seed scripts for idempotent lookups. Not displayed.',
      },
    },
    {
      name: 'isPlaceholder',
      type: 'checkbox',
      label: { zh: '占位图', en: 'Placeholder' },
      defaultValue: false,
      admin: {
        description: 'Mark Unsplash/stock placeholders to review before launch',
      },
    },
  ],
}
