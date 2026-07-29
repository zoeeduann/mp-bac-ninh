import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'
import { autoGenerateMediaAltAfterChange, syncMediaUrlAfterChange } from './Media.hooks'

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
  hooks: {
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
    afterChange: [syncMediaUrlAfterChange, autoGenerateMediaAltAfterChange],
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      // 240×240 square cover — used in admin list and as card thumbnails
      { name: 'thumbnail', width: 240, height: 240, fit: 'cover' },
      // 720px wide, auto-height — for content cards
      { name: 'card', width: 720, fit: 'inside' },
      // 1600px wide, auto-height — for hero banners
      { name: 'hero', width: 1600, fit: 'inside' },
      // 1200×630 cover — for Open Graph sharing
      { name: 'og', width: 1200, height: 630, fit: 'cover' },
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
