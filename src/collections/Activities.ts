import type { CollectionConfig } from 'payload'
import { isAdminOrScopedStaff, byStaffLocation, forceStaffLocation } from '../access'
import { slugify } from '../lib/slugify'
import { translateForSlug } from '../lib/translate'
import {
  activitiesBeforeValidate,
  activitiesBeforeChange,
  activitiesAutoTranslate,
  activitiesIndexNow,
  activitiesDeletedIndexNow,
} from './Activities.hooks'

export const Activities: CollectionConfig = {
  slug: 'activities',
  labels: {
    singular: { zh: '活动', en: 'Activity' },
    plural: { zh: '活动', en: 'Activities' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'category'],
  },
  access: {
    // Guests: only published activities (any academy).
    // Admin: everything.
    // Staff: scoped to their own academy via byStaffLocation (returns
    // either true for admin, false, or a { location: { equals: id } } filter).
    read: ({ req }) => {
      if (!req.user) return { status: { equals: 'published' } }
      return byStaffLocation({ req } as any)
    },
    // Create: admin, or staff with an assigned academy. The location is
    // force-set in beforeChange so staff can't sneak rows into another academy.
    create: isAdminOrScopedStaff,
    // Update/delete: same scoping as read — staff can only touch their academy.
    update: ({ req }) => byStaffLocation({ req } as any),
    delete: ({ req }) => byStaffLocation({ req } as any),
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
            // Translate the Chinese title to English via Claude (using the
            // brand glossary so academy names stay pinyin), then slugify.
            // Bound to 8s so a slow API call can't hold up the save; fall back
            // to slugifying the Chinese title directly if Claude is
            // unavailable or times out.
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
      name: 'category',
      type: 'relationship',
      label: { zh: '类别', en: 'Category' },
      relationTo: 'categories',
      required: true,
    },
    {
      // Which academy this activity belongs to. Required, indexed for fast
      // per-location queries (e.g. /chiangmai/activities).
      // For staff users, the dropdown is filtered to their own academy and
      // pre-filled by defaultValue; server-side forceStaffLocation in
      // beforeChange enforces this regardless of what the client posts.
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
      name: 'heroImage',
      type: 'upload',
      label: { zh: '主图', en: 'Hero image' },
      relationTo: 'media',
      required: true,
    },
    {
      name: 'gallery',
      type: 'array',
      label: { zh: '图库', en: 'Gallery' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'shortDesc',
      type: 'textarea',
      label: { zh: '简短描述', en: 'Short description' },
      localized: true,
      required: true,
      maxLength: 240,
      admin: {
        description: 'Short description shown in list views (max 240 characters)',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: { zh: '详细描述', en: 'Description' },
      localized: true,
    },
    {
      // Venue note: free-text override for where specifically within the academy
      // this takes place. Renamed from the old `location` text field (Chunk 2.5).
      name: 'venueNote',
      type: 'text',
      label: { zh: '场地备注', en: 'Venue note' },
      localized: true,
      // Per-locale defaults on localized fields are not supported by Payload v3's
      // postgres adapter (object literal serializes to "[object Object]" in DDL).
      // Use a function form to return the right value per locale at runtime.
      defaultValue: ({ locale }: { locale?: string }) =>
        locale === 'en' ? 'At the academy' : '学堂',
    },
    {
      name: 'capacity',
      type: 'number',
      label: { zh: '名额上限', en: 'Capacity' },
      required: true,
      min: 1,
    },
    {
      name: 'notes',
      type: 'richText',
      label: { zh: '注意事项', en: 'Notes' },
      localized: true,
      admin: {
        description: 'Internal notes (visible to admin/staff only in context)',
      },
    },
    {
      // Task 2.5 SCOPE NOTE: The plan describes three quick-add buttons
      // (single / weekly / multi-day) as custom Payload UI components.
      // These are DEFERRED to v1.1 because implementing robust custom
      // Payload admin components adds complexity not warranted for the
      // initial launch. The default "+ Add Row" button covers all use cases.
      name: 'occurrences',
      type: 'array',
      label: { zh: '场次', en: 'Sessions' },
      admin: {
        description:
          'Add occurrences manually using "+ Add Row". ' +
          'Weekly/multi-day quick-add coming in v1.1.',
      },
      fields: [
        {
          name: 'startAt',
          type: 'date',
          label: { zh: '开始时间', en: 'Start' },
          required: true,
          admin: {
            // pickerAppearance kept so non-component-aware tooling (CSV
            // imports, GraphQL clients) still gets the right format hint.
            date: { pickerAppearance: 'dayAndTime' },
            components: {
              // Force Bangkok TZ + 24-hour input regardless of editor's
              // browser timezone.
              Field: '@/components/admin/BkkDateTimeField',
            },
          },
        },
        {
          name: 'endAt',
          type: 'date',
          label: { zh: '结束时间', en: 'End' },
          required: true,
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            components: {
              Field: '@/components/admin/BkkDateTimeField',
            },
          },
        },
        {
          name: 'capacityOverride',
          type: 'number',
          label: { zh: '本场名额(覆盖默认)', en: 'Capacity override' },
          min: 1,
          admin: {
            description: 'Leave blank to use the activity-level capacity',
          },
        },
        {
          name: 'status',
          type: 'select',
          label: { zh: '状态', en: 'Status' },
          required: true,
          defaultValue: 'open',
          options: [
            { label: 'Open', value: 'open' },
            { label: 'Full', value: 'full' },
            { label: 'Cancelled', value: 'cancelled' },
            // 'deleted' = soft-deleted by the beforeChange hook; hidden from UI
            { label: 'Deleted', value: 'deleted' },
          ],
        },
        {
          name: 'internalNotes',
          type: 'textarea',
          label: { zh: '内部备注', en: 'Internal notes' },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: { zh: '状态', en: 'Status' },
      required: true,
      defaultValue: 'draft',
      options: [
        { label: { zh: '草稿', en: 'Draft' }, value: 'draft' },
        { label: { zh: '已发布', en: 'Published' }, value: 'published' },
        { label: { zh: '已归档', en: 'Archived' }, value: 'archived' },
      ],
    },
    {
      name: 'seoTitle',
      type: 'text',
      label: { zh: 'SEO 标题', en: 'SEO title' },
      localized: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      label: { zh: 'SEO 描述', en: 'SEO description' },
      localized: true,
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    beforeValidate: [activitiesBeforeValidate as any],
    beforeChange: [
      // Run forceStaffLocation FIRST so staff users can't override their
      // academy via a direct API POST. Admins pass through untouched.
      (async ({ req, data }: any) => forceStaffLocation({ req, data })) as any,
      activitiesBeforeChange as any,
    ],
    afterChange: [activitiesAutoTranslate as any, activitiesIndexNow as any],
    afterDelete: [activitiesDeletedIndexNow as any],
    beforeDelete: [
      /**
       * Hard-delete protection: refuse if active reservations reference this
       * activity. The reservations collection may not be registered yet during
       * bootstrap — guard with a collection-existence check.
       */
      async ({ req, id }) => {
        if (!req.payload.collections['reservations']) return

        const inUse = await req.payload.find({
          collection: 'reservations',
          where: {
            and: [
              { activity: { equals: id } },
              { status: { in: ['pending', 'confirmed', 'waitlist'] } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        })

        if (inUse.totalDocs > 0) {
          throw new Error('该活动有预约记录，无法删除。请改为归档（status=archived）。')
        }
      },
    ],
  },
}
