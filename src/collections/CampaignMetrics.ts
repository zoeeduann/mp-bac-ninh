import type { CollectionConfig, FieldHook } from 'payload'
import { denyAll, isAdminOrStaff } from '../access'

const dropoff = (from: string, to: string) =>
  (({ siblingData }) =>
    Math.max(
      0,
      Number(siblingData?.[from] ?? 0) - Number(siblingData?.[to] ?? 0),
    )) satisfies FieldHook

const percent = (numerator: string, denominator: string) =>
  (({ siblingData }) => {
    const total = Number(siblingData?.[denominator] ?? 0)
    if (!total) return '—'
    return `${((Number(siblingData?.[numerator] ?? 0) / total) * 100).toFixed(1)}%`
  }) satisfies FieldHook

/**
 * Anonymous, daily aggregate counts for the two paid-campaign landing pages.
 * Rows contain no visitor identifiers or contact details. They are written
 * atomically by server-side SQL so concurrent visits cannot overwrite counts.
 */
export const CampaignMetrics: CollectionConfig = {
  slug: 'campaign-metrics',
  defaultSort: '-metricDate',
  labels: {
    singular: { zh: '广告漏斗日统计', en: 'Campaign Funnel Day' },
    plural: { zh: '广告漏斗统计', en: 'Campaign Funnel' },
  },
  admin: {
    useAsTitle: 'metricKey',
    defaultColumns: [
      'metricDate',
      'focusLabel',
      'utmCampaign',
      'utmContent',
      'pageViews',
      'formStarts',
      'leadSuccesses',
      'visitDropoff',
      'formDropoff',
      'leadRate',
    ],
  },
  access: {
    read: isAdminOrStaff,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  fields: [
    {
      name: 'metricKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { hidden: true, readOnly: true },
    },
    {
      name: 'metricDate',
      type: 'text',
      label: { zh: '日期（越南时间）', en: 'Date (Vietnam time)' },
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'focus',
      type: 'select',
      label: { zh: '页面', en: 'Landing page' },
      required: true,
      index: true,
      options: [
        { label: { zh: '正念活动', en: 'Mindfulness' }, value: 'mindfulness' },
        { label: { zh: '佛学课程', en: 'Buddhism' }, value: 'buddhism' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'focusLabel',
      type: 'text',
      label: { zh: '页面', en: 'Landing page' },
      virtual: true,
      admin: { readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }) => (siblingData?.focus === 'mindfulness' ? '正念活动' : '佛学课程'),
        ],
      },
    },
    {
      name: 'utmSource',
      type: 'text',
      label: { zh: '来源', en: 'UTM source' },
      admin: { readOnly: true },
    },
    {
      name: 'utmMedium',
      type: 'text',
      label: { zh: '媒介', en: 'UTM medium' },
      admin: { readOnly: true },
    },
    {
      name: 'utmCampaign',
      type: 'text',
      label: { zh: '广告系列', en: 'UTM campaign' },
      admin: { readOnly: true },
    },
    {
      name: 'utmContent',
      type: 'text',
      label: { zh: '广告素材', en: 'UTM content' },
      admin: { readOnly: true },
    },
    {
      name: 'pageViews',
      type: 'number',
      label: { zh: '访问次数', en: 'Visits' },
      required: true,
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'formStarts',
      type: 'number',
      label: { zh: '开始填写', en: 'Form starts' },
      required: true,
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'leadSuccesses',
      type: 'number',
      label: { zh: '成功咨询', en: 'Successful inquiries' },
      required: true,
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'visitDropoff',
      type: 'number',
      label: { zh: '未开始填写', en: 'Visit drop-off' },
      virtual: true,
      admin: { readOnly: true },
      hooks: { afterRead: [dropoff('pageViews', 'formStarts')] },
    },
    {
      name: 'formDropoff',
      type: 'number',
      label: { zh: '填写后未成功', en: 'Form drop-off' },
      virtual: true,
      admin: { readOnly: true },
      hooks: { afterRead: [dropoff('formStarts', 'leadSuccesses')] },
    },
    {
      name: 'formStartRate',
      type: 'text',
      label: { zh: '开始填写率', en: 'Form-start rate' },
      virtual: true,
      admin: { readOnly: true },
      hooks: { afterRead: [percent('formStarts', 'pageViews')] },
    },
    {
      name: 'completionRate',
      type: 'text',
      label: { zh: '填写完成率', en: 'Form completion rate' },
      virtual: true,
      admin: { readOnly: true },
      hooks: { afterRead: [percent('leadSuccesses', 'formStarts')] },
    },
    {
      name: 'leadRate',
      type: 'text',
      label: { zh: '最终咨询率', en: 'Final inquiry rate' },
      virtual: true,
      admin: { readOnly: true },
      hooks: { afterRead: [percent('leadSuccesses', 'pageViews')] },
    },
  ],
}
