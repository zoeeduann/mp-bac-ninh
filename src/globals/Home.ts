/**
 * portalHome global — network-level hero for the "/" portal page.
 *
 * This is the top-level "Mindfulpeace Academy Thailand" landing page, NOT a
 * per-academy home. Per-academy content lives in the Locations collection.
 *
 * Renamed from slug 'home' to 'portal-home' in Chunk 2.5 to reflect the
 * multi-academy pivot. Fields are identical to the old Home global.
 *
 * Access: read = public; update = admin only (spec §6.4 — portalHome is
 * structural like Settings, not per-academy content staff would edit).
 */
import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'

export const PortalHome: GlobalConfig = {
  slug: 'portal-home',
  label: { zh: '总门户首页', en: 'Portal Home' },
  admin: {
    // Display label for the admin sidebar nav
    group: { zh: '全局', en: 'Globals' },
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'heroImage',
      type: 'upload',
      label: { zh: '主视觉', en: 'Hero image' },
      relationTo: 'media',
      required: true,
    },
    {
      name: 'heroTitle',
      type: 'text',
      label: { zh: '主标题', en: 'Hero title' },
      localized: true,
      required: true,
    },
    {
      name: 'heroSubtitle',
      type: 'textarea',
      label: { zh: '副标题', en: 'Hero subtitle' },
      localized: true,
    },
    {
      name: 'ctaPrimary',
      type: 'group',
      label: { zh: '主按钮', en: 'Primary CTA' },
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'href', type: 'text', defaultValue: '#academies' },
      ],
    },
    {
      name: 'ctaSecondary',
      type: 'group',
      label: { zh: '副按钮', en: 'Secondary CTA' },
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'href', type: 'text', defaultValue: '#about-network' },
      ],
    },
    {
      name: 'middleParagraph',
      type: 'richText',
      label: { zh: '中段段落', en: 'Middle paragraph' },
      localized: true,
    },
  ],
}
