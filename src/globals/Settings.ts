import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: { zh: '站点设置', en: 'Settings' },
  admin: {
    group: { zh: '全局', en: 'Globals' },
    hidden: ({ user }) => user?.role !== 'admin',
  },
  // Settings update is admin-only; other globals allow admin OR staff updates
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: { zh: '站点名称', en: 'Site name' },
      localized: true,
      required: true,
    },
    {
      name: 'ogDefault',
      type: 'upload',
      label: { zh: '默认 OG 图', en: 'Default OG image' },
      relationTo: 'media',
    },
    {
      name: 'footerText',
      type: 'text',
      label: { zh: '页脚文字', en: 'Footer text' },
      localized: true,
    },
    {
      name: 'adminEmail',
      type: 'email',
      label: { zh: '管理员邮箱', en: 'Admin email' },
      required: true,
      admin: { description: '新预约提醒邮箱 / Admin email for new reservation notifications' },
    },
    {
      name: 'mindfulpeaceOrgUrl',
      type: 'text',
      label: { zh: 'mindfulpeace.org 链接', en: 'mindfulpeace.org URL' },
      defaultValue: 'https://mindfulpeace.org/',
    },
    {
      // Fallback academy when the URL is malformed or missing a location slug.
      // Optional — the public site and API layer should handle the null case.
      name: 'defaultLocation',
      type: 'relationship',
      label: { zh: '默认学堂', en: 'Default location' },
      relationTo: 'locations',
      admin: {
        description: 'Fallback academy when URL has no location slug (optional)',
      },
    },
  ],
}
