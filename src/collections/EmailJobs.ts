import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const EmailJobs: CollectionConfig = {
  slug: 'email-jobs',
  labels: {
    singular: { zh: '邮件任务', en: 'Email Job' },
    plural: { zh: '邮件任务', en: 'Email Jobs' },
  },
  admin: { hidden: ({ user }) => user?.role !== 'admin' },
  access: {
    read: isAdmin,
    create: () => true, // queued by server-side code
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'to', type: 'email', label: { zh: '收件人', en: 'To' }, required: true },
    { name: 'subject', type: 'text', label: { zh: '主题', en: 'Subject' }, required: true },
    { name: 'body', type: 'textarea', label: { zh: '正文', en: 'Body' }, required: true },
    {
      name: 'fromName',
      type: 'text',
      admin: { description: 'Sender display name (defaults to 静心学堂 · 泰国). Per-academy emails set this to the academy name.' },
    },
    {
      name: 'replyTo',
      type: 'email',
      admin: { description: 'Reply-To header — usually the academy-specific email so replies route correctly.' },
    },
    {
      name: 'attachments',
      type: 'json',
      admin: { description: 'Pass-through to nodemailer attachments array' },
    },
    {
      name: 'relatedReservation',
      type: 'relationship',
      relationTo: 'reservations',
    },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'lastError', type: 'text' },
    {
      name: 'status',
      type: 'select',
      label: { zh: '状态', en: 'Status' },
      defaultValue: 'pending',
      options: ['pending', 'sent', 'failed'].map(v => ({ label: v, value: v })),
    },
  ],
}
