/**
 * Locations collection — one row per academy.
 *
 * Access:
 *   read   → public (anyone can read location info)
 *   create / update / delete → admin ONLY (structural change; spec §6.4)
 *   NOT isAdminOrStaff — staff cannot modify academy records.
 */
import type { CollectionConfig } from 'payload'
import { byOwnStaffLocation, isAdmin } from '../access'
import { notifyIndexNowForLocation } from '../lib/indexnow-content'

export const Locations: CollectionConfig = {
  slug: 'locations',
  labels: {
    singular: { zh: '学堂', en: 'Academy' },
    plural: { zh: '学堂', en: 'Academies' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'slug', 'isThailandNetwork', 'order'],
  },
  access: {
    // Public pages can read every academy. In the authenticated admin UI,
    // staff only see their assigned academy while admins retain full access.
    read: ({ req }) => {
      if (!req.user) return true
      return byOwnStaffLocation({ req } as any)
    },
    create: isAdmin,
    update: ({ req }) => byOwnStaffLocation({ req } as any),
    delete: isAdmin,
  },
  hooks: {
    afterChange: [
      (async ({ doc, req }: any) => {
        try {
          await notifyIndexNowForLocation({ doc, req })
        } catch (e) {
          console.error(`[indexnow] location hook failed for ${doc?.id ?? 'unknown'}:`, e)
        }
        return doc
      }) as any,
    ],
    afterDelete: [
      (async ({ doc, req }: any) => {
        try {
          await notifyIndexNowForLocation({ doc, req })
        } catch (e) {
          console.error(`[indexnow] deleted location hook failed for ${doc?.id ?? 'unknown'}:`, e)
        }
        return doc
      }) as any,
    ],
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      label: { zh: 'URL slug', en: 'Slug' },
      required: true,
      unique: true,
      index: true,
      access: {
        update: ({ req }) => req.user?.role === 'admin',
      },
      admin: {
        description: 'URL-safe identifier: bangkok / chiangmai / phuket',
      },
    },
    {
      name: 'name',
      type: 'text',
      label: { zh: '学堂名', en: 'Academy name' },
      required: true,
      localized: true,
    },
    {
      name: 'city',
      type: 'text',
      label: { zh: '城市', en: 'City' },
      required: true,
      localized: true,
    },
    {
      name: 'timeZone',
      type: 'text',
      label: { zh: '当地时区', en: 'Local time zone' },
      required: true,
      defaultValue: 'Asia/Ho_Chi_Minh',
      admin: {
        description: {
          zh: 'IANA 时区名称，用于预约邮件、提醒和日历邀请，例如 Asia/Ho_Chi_Minh。',
          en: 'IANA time zone used by booking emails, reminders and calendar invitations, e.g. Asia/Ho_Chi_Minh.',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'isThailandNetwork',
      type: 'checkbox',
      label: { zh: '属于泰国站', en: 'Part of the Thailand network' },
      defaultValue: true,
      required: true,
      access: {
        update: ({ req }) => req.user?.role === 'admin',
      },
      admin: {
        description: {
          zh: '仅泰国站的曼谷、清迈、普吉学堂勾选。独立页面（如越南北宁善明小院）请取消勾选，便不会出现在泰国总门户、学堂切换或网络聚合内容中。',
          en: 'Enable only for Thailand-network academies. Standalone pages stay accessible but are excluded from the Thailand portal, switcher, and network feeds.',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'tagline',
      type: 'text',
      label: { zh: '一句话气质描述', en: 'Tagline' },
      localized: true,
    },
    {
      name: 'heroImage',
      type: 'upload',
      label: { zh: '主视觉', en: 'Hero image' },
      relationTo: 'media',
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      label: { zh: '学堂 Logo', en: 'Academy logo' },
      relationTo: 'media',
      admin: {
        description:
          '可选。上传后，该学堂页面顶栏将显示此 logo；未上传时显示学堂名称。建议横版、透明背景 PNG，高度 ≥ 200px。',
      },
    },
    {
      name: 'story',
      type: 'richText',
      label: { zh: '学堂故事', en: 'Story' },
      localized: true,
      admin: {
        description: 'Academy story (replaces About global)',
      },
    },
    {
      // Short tagline rendered directly after `story` on the academy home
      // page. Per-academy because the practices differ — Bangkok (city)
      // doesn't have a walking path, so its line reads "静坐、禅茶、读书、
      // 抄经" instead of the default "静坐、喝茶、读书、行走". Leave blank
      // to use the network default.
      name: 'signatureLine',
      type: 'text',
      label: { zh: '修学之意一句话', en: 'Signature line' },
      localized: true,
      admin: {
        description: {
          zh: '可选。学堂故事下方那行小注脚,例如「静坐、禅茶、读书、抄经」。留空会用默认「静坐、喝茶、读书、行走」。',
          en: 'Optional. The small tagline shown below the story, e.g. "We sit, drink tea, read, copy sutras." Leave blank to fall back to the default ("We sit, drink tea, read, and walk together.").',
        },
      },
    },
    {
      name: 'address',
      type: 'textarea',
      label: { zh: '地址', en: 'Address' },
      localized: true,
    },
    {
      name: 'mapEmbedUrl',
      type: 'text',
      label: { zh: '地图嵌入 URL', en: 'Map embed URL' },
      admin: { description: 'Google Maps embed URL' },
    },
    {
      name: 'transport',
      type: 'richText',
      label: { zh: '交通方式', en: 'Transport' },
      localized: true,
      admin: { description: 'How to get here' },
    },
    {
      name: 'team',
      type: 'array',
      label: { zh: '团队成员', en: 'Team' },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: { zh: '姓名', en: 'Name' },
          required: true,
          localized: true,
        },
        {
          name: 'photo',
          type: 'upload',
          label: { zh: '照片', en: 'Photo' },
          relationTo: 'media',
        },
        {
          name: 'bio',
          type: 'textarea',
          label: { zh: '简介', en: 'Bio' },
          localized: true,
        },
      ],
    },
    {
      name: 'email',
      type: 'email',
      label: { zh: '邮箱', en: 'Email' },
      admin: { description: 'Academy contact email' },
    },
    {
      name: 'phone',
      type: 'text',
      label: { zh: '电话', en: 'Phone' },
    },
    {
      // WeChat ID (text handle). Chinese visitors typically prefer to
      // search this handle in WeChat and add directly rather than fill a
      // form — display it prominently on contact / footer / booking flows.
      name: 'wechatId',
      type: 'text',
      label: { zh: '微信号', en: 'WeChat ID' },
      admin: { description: '微信号 / WeChat ID (text handle, e.g. xindeng_cm)' },
    },
    {
      name: 'whatsapp',
      type: 'text',
      label: { zh: 'WhatsApp', en: 'WhatsApp' },
      admin: {
        description: 'WhatsApp number with country code (e.g. +66 81 234 5678) or a wa.me/... URL',
      },
    },
    {
      name: 'wechatQr',
      type: 'upload',
      label: { zh: '微信二维码', en: 'WeChat QR' },
      relationTo: 'media',
      admin: { description: 'WeChat QR code image' },
    },
    {
      name: 'social',
      type: 'array',
      label: { zh: '社交链接', en: 'Social' },
      fields: [
        { name: 'label', type: 'text', label: { zh: '标签', en: 'Label' } },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
    {
      name: 'faq',
      type: 'array',
      label: { zh: 'FAQ', en: 'FAQ' },
      fields: [
        {
          name: 'q',
          type: 'text',
          label: { zh: '问题', en: 'Question' },
          required: true,
          localized: true,
        },
        {
          name: 'a',
          type: 'richText',
          label: { zh: '回答', en: 'Answer' },
          required: true,
          localized: true,
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      label: { zh: '排序权重', en: 'Order' },
      defaultValue: 99,
      access: {
        update: ({ req }) => req.user?.role === 'admin',
      },
      admin: {
        description: 'Sort order on the portal home page (lower = first)',
        position: 'sidebar',
      },
    },
  ],
}
