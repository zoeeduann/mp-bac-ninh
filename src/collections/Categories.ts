import type { CollectionConfig } from 'payload'
import { isAdminOrStaff } from '../access'
import { slugify } from '../lib/slugify'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: { zh: '类别', en: 'Category' },
    plural: { zh: '类别', en: 'Categories' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order'],
  },
  access: {
    read: () => true,
    create: isAdminOrStaff,
    update: isAdminOrStaff,
    delete: isAdminOrStaff,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: { zh: '类别名', en: 'Name' },
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
          // Auto-generate slug from zh-CN name if not explicitly set
          ({ value, data }) => value || slugify((data as any)?.name ?? ''),
        ],
      },
      admin: {
        description: 'URL-safe identifier; auto-generated from name if left blank',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: { zh: '排序权重', en: 'Order' },
      defaultValue: 0,
      admin: {
        description: 'Sort order in category lists (ascending)',
      },
    },
  ],
  hooks: {
    beforeDelete: [
      async ({ req, id }) => {
        // Guard: the Activities collection may not be registered yet during bootstrap.
        if (!req.payload.collections['activities']) return

        const inUse = await req.payload.find({
          collection: 'activities',
          where: { category: { equals: id } },
          limit: 1,
          overrideAccess: true,
        })

        if (inUse.totalDocs > 0) {
          throw new Error(
            '该类别下还有活动，无法删除。请先把使用该类别的活动改成别的类别。',
          )
        }
      },
    ],
  },
}
