import type { CollectionConfig } from 'payload'
import { isAdminOrScopedStaff, byStaffLocation, forceStaffLocation } from '../access'
import { slugify } from '../lib/slugify'
import { translateForSlug } from '../lib/translate'
import { notifyIndexNowForJournal } from '../lib/indexnow-content'
import { autoGenerateJournalAltAfterChange } from './Journal.hooks'

export const Journal: CollectionConfig = {
  slug: 'journal',
  labels: {
    singular: { zh: '学堂笔记', en: 'Journal Entry' },
    plural: { zh: '学堂笔记', en: 'Journal' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'status'],
  },
  access: {
    // Guests see only published entries; admin sees all; staff scoped to academy.
    read: ({ req }) => {
      if (!req.user) return { status: { equals: 'published' } }
      return byStaffLocation({ req } as any)
    },
    create: isAdminOrScopedStaff,
    update: ({ req }) => byStaffLocation({ req } as any),
    delete: ({ req }) => byStaffLocation({ req } as any),
  },
  hooks: {
    beforeChange: [
      // Force staff users' writes to their own academy regardless of payload.
      (async ({ req, data }: any) => forceStaffLocation({ req, data })) as any,
    ],
    afterChange: [
      autoGenerateJournalAltAfterChange,
      (async ({ doc, previousDoc, req }: any) => {
        try {
          await notifyIndexNowForJournal({ doc, previousDoc, req })
        } catch (e) {
          console.error(`[indexnow] journal hook failed for ${doc?.id ?? 'unknown'}:`, e)
        }
        return doc
      }) as any,
    ],
    afterDelete: [
      (async ({ doc, req }: any) => {
        try {
          await notifyIndexNowForJournal({ doc, req })
        } catch (e) {
          console.error(`[indexnow] deleted journal hook failed for ${doc?.id ?? 'unknown'}:`, e)
        }
        return doc
      }) as any,
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { zh: '标题', en: 'Title' },
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: { zh: 'URL slug', en: 'Slug' },
      required: true,
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [
          async ({ value, data }) => {
            if (value) return value
            const zhTitle = (data as any)?.title ?? ''
            if (!zhTitle) return ''
            // Same pattern as Activities slug: translate the Chinese title to
            // English via Claude (using the brand glossary so academy names
            // stay pinyin), then slugify. Bounded to 8s so a slow API call
            // can't hold up the save; fall back to slugifying the Chinese
            // title directly if Claude is unavailable or times out.
            let enTitle: string | null = null
            try {
              enTitle = await Promise.race([
                translateForSlug(zhTitle),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
              ])
            } catch {
              // swallow — fall through to plain slugify(zhTitle)
            }
            return slugify(enTitle || zhTitle)
          },
        ],
      },
      admin: {
        description: {
          zh: '网址用。**留空会自动用 AI 把标题翻成英文再生成 slug**(学堂名按拼音:如如/心灯/和光);也可以手填英文(小写字母、数字、连字符)。必须唯一。',
          en: 'Used in the page URL. **Leave blank to auto-generate from the Chinese title via AI translation** (academy names stay in pinyin: Ruru / Xindeng / Heguang); or enter English manually (lowercase letters, numbers, hyphens). Must be unique.',
        },
      },
    },
    {
      name: 'date',
      type: 'date',
      label: { zh: '日期', en: 'Date' },
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      // Which academy this journal entry belongs to (spec §6.1, required + indexed).
      // Staff users see only their own academy here (filterOptions) and it's
      // pre-selected for them (defaultValue). Admin sees all academies.
      name: 'location',
      type: 'relationship',
      label: { zh: '学堂', en: 'Academy' },
      relationTo: 'locations',
      required: true,
      index: true,
      filterOptions: ({ user }) => {
        const u = user as { role?: string; staffLocation?: unknown } | null
        if (!u || u.role === 'admin') return true
        if (u.role === 'staff' && u.staffLocation) {
          const id =
            typeof u.staffLocation === 'object'
              ? (u.staffLocation as { id?: number | string }).id
              : u.staffLocation
          if (id != null) return { id: { equals: id } }
        }
        return false
      },
      defaultValue: ({ user }) => {
        const u = user as { role?: string; staffLocation?: unknown } | null
        if (u?.role === 'staff' && u.staffLocation) {
          return typeof u.staffLocation === 'object'
            ? (u.staffLocation as { id?: number | string }).id
            : u.staffLocation
        }
        return undefined
      },
    },
    {
      name: 'relatedActivity',
      type: 'relationship',
      label: { zh: '关联活动', en: 'Related activity' },
      relationTo: 'activities',
      // Only allow linking to activities at the same location as this journal entry.
      filterOptions: ({ data }: any) =>
        data?.location
          ? {
              location: {
                equals: typeof data.location === 'object' ? data.location.id : data.location,
              },
            }
          : true,
      admin: {
        description: 'Optional. Only activities at the same location are selectable.',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      label: { zh: '封面图', en: 'Cover image' },
      relationTo: 'media',
      required: true,
    },
    {
      name: 'coverAlt',
      type: 'text',
      label: { zh: '封面图内容说明（自动生成）', en: 'Cover image description (auto-generated)' },
      localized: true,
      admin: {
        description: {
          zh: '保存文章后，AI 会结合封面和文章内容自动填写。可以修改；人工内容不会被覆盖。',
          en: 'Generated from the cover image and article context after save. Manual text is never overwritten.',
        },
        placeholder: {
          zh: '留空即可自动生成',
          en: 'Leave blank to generate automatically',
        },
      },
    },
    {
      name: 'photos',
      type: 'array',
      label: { zh: '照片', en: 'Photos' },
      minRows: 1,
      required: true,
      fields: [
        {
          name: 'image',
          type: 'upload',
          label: { zh: '图片', en: 'Image' },
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          label: { zh: '说明', en: 'Caption' },
          localized: true,
        },
        {
          name: 'alt',
          type: 'text',
          label: { zh: '图片内容说明（自动生成）', en: 'Image description (auto-generated)' },
          localized: true,
          admin: {
            description: {
              zh: '保存文章后自动生成；如需调整可以直接修改。',
              en: 'Generated after the article is saved; edit it whenever needed.',
            },
            placeholder: {
              zh: '留空即可自动生成',
              en: 'Leave blank to generate automatically',
            },
          },
        },
      ],
    },
    {
      name: 'body',
      type: 'richText',
      label: { zh: '回顾文字', en: 'Body' },
      localized: true,
    },
    {
      name: 'status',
      type: 'select',
      label: { zh: '状态', en: 'Status' },
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
  ],
}
