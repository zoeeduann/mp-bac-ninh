import type { CollectionConfig } from 'payload'
import { byStaffLocation, isAdminOrScopedStaff } from '../access'
import { reservationsBeforeChange, reservationsAfterChange } from './Reservations.hooks'

export const Reservations: CollectionConfig = {
  slug: 'reservations',
  labels: {
    singular: { zh: '预约', en: 'Reservation' },
    plural: { zh: '预约', en: 'Reservations' },
  },
  // Public-facing POST creation is shadowed by our hardened Next.js route at
  // src/app/api/reservations/route.ts (Turnstile + rate limiting). That route
  // takes precedence over Payload's auto POST handler at the same URL, so the
  // hardened path is the only externally-reachable creation surface even
  // though Payload's endpoints are otherwise enabled. Other REST methods
  // (PATCH/GET/DELETE) DO go through Payload's defaults — but every one of
  // them is gated by access.{read,create,update,delete} below, which require
  // an admin/staff session, so they're safe to enable. The admin UI itself
  // needs these endpoints to save edits (we hit a 405 on PATCH without them).
  disableDuplicate: true,
  // graphQL: false stays — we don't use it and it widens the attack surface.
  graphQL: false,
  admin: {
    useAsTitle: 'name',
    defaultColumns: [
      'source',
      'createdAt',
      'name',
      'activity',
      'occurrenceLabel',
      'status',
      'notes',
      'internalNotes',
    ],
    listSearchableFields: ['name', 'email', 'wechatId', 'phone'],
  },
  access: {
    // Admin sees all reservations; staff scoped to their academy.
    // (location is set by the reservation route from the activity or URL slug,
    //  so we don't need forceStaffLocation — but read/update still scope.)
    read: ({ req }) => byStaffLocation({ req } as any),
    // Allow admin/scoped staff to create via admin UI; also allow server-side creation
    // via req.context.internal (set by our /api/reservations route handler).
    // Staff who try to create via admin UI for another academy are forced or
    // filtered to their assigned academy by the relationship field and hooks.
    create: ({ req }) =>
      Boolean(isAdminOrScopedStaff({ req } as any) || (req.context as any)?.internal === true),
    update: ({ req }) => byStaffLocation({ req } as any),
    // Hard-delete is forbidden; soft-delete by changing status to 'deleted'
    delete: () => false,
  },
  fields: [
    {
      name: 'source',
      type: 'select',
      label: { zh: '入口来源', en: 'Source' },
      required: true,
      defaultValue: 'activity_detail',
      options: [
        'home_cta',
        'nav_book',
        'book_list',
        'book_general_inquiry',
        'activity_detail',
        'shared_link',
      ].map((v) => ({ label: v, value: v })),
    },
    {
      // Which academy this reservation belongs to. For activity reservations,
      // derived automatically from activity.location in the beforeChange hook.
      // For general inquiries, set by the route handler from the URL slug.
      // Staff users see only their own academy in this dropdown.
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
      // Staff users only see activities at their own academy here. Admins see all.
      name: 'activity',
      type: 'relationship',
      label: { zh: '活动', en: 'Activity' },
      relationTo: 'activities',
      filterOptions: ({ user }) => {
        const u = user as { role?: string; staffLocation?: unknown } | null
        if (!u || u.role === 'admin') return true
        if (u.role === 'staff' && u.staffLocation) {
          const id =
            typeof u.staffLocation === 'object'
              ? (u.staffLocation as { id?: number | string }).id
              : u.staffLocation
          if (id != null) return { location: { equals: id } }
        }
        return false
      },
    },
    {
      name: 'occurrenceId',
      type: 'text',
      label: { zh: '场次 ID', en: 'Occurrence ID' },
      admin: {
        description: 'The occurrence.id within the activity this reservation is for',
        // Hidden in the admin UI — humans read occurrenceLabel below instead.
        // Kept readable in detail-view via virtual sibling, kept stored so the
        // booking still has a stable reference even if the activity is later
        // edited.
        hidden: true,
      },
    },
    {
      // Virtual (not stored): resolves occurrenceId → human-readable BKK time
      // by looking up the activity's occurrences in afterRead. Surfaces in the
      // list view column and in the detail view as a read-only line so staff
      // can immediately see which session was booked.
      name: 'occurrenceLabel',
      type: 'text',
      label: { zh: '预约场次', en: 'Booked session' },
      virtual: true,
      admin: {
        readOnly: true,
        description: '自动从场次 ID 解析,显示 BKK 本地时间',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            const activityRef = (data as any)?.activity
            const occId = (data as any)?.occurrenceId
            if (!activityRef || !occId) return null
            try {
              const activityId =
                typeof activityRef === 'object' && activityRef?.id ? activityRef.id : activityRef
              const activity = await req.payload.findByID({
                collection: 'activities',
                id: String(activityId),
                depth: 0,
                overrideAccess: true,
              })
              const occ = (activity?.occurrences as any[] | undefined)?.find(
                (o: any) => String(o.id) === String(occId),
              )
              if (!occ?.startAt) return null
              const start = new Date(occ.startAt)
              const end = occ.endAt ? new Date(occ.endAt) : null
              if (isNaN(start.getTime())) return null
              const fmt = (d: Date) =>
                d.toLocaleString('zh-CN', {
                  timeZone: 'Asia/Bangkok',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              return end && !isNaN(end.getTime())
                ? `${fmt(start)}–${fmt(end).slice(-5)}`
                : fmt(start)
            } catch {
              return null
            }
          },
        ],
      },
    },
    {
      name: 'name',
      type: 'text',
      label: { zh: '姓名', en: 'Name' },
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      label: { zh: '邮箱', en: 'Email' },
    },
    {
      name: 'wechatId',
      type: 'text',
      label: { zh: '微信号', en: 'WeChat ID' },
    },
    {
      name: 'phone',
      type: 'text',
      label: { zh: '电话', en: 'Phone' },
      required: true,
    },
    {
      name: 'guests',
      type: 'number',
      label: { zh: '人数', en: 'Guests' },
      required: true,
      defaultValue: 1,
      min: 1,
      max: 10,
    },
    {
      // Only shown when the reservation is a general inquiry (no specific activity)
      name: 'direction',
      type: 'select',
      label: { zh: '咨询方向', en: 'Direction' },
      admin: {
        condition: (data) => !data?.activity,
        description: 'Interest direction for general inquiries',
      },
      options: ['meditation', 'mindfulness', 'one_on_one', 'visit', 'other'].map((v) => ({
        label: v,
        value: v,
      })),
    },
    {
      name: 'notes',
      type: 'textarea',
      label: { zh: '访客留言', en: 'Visitor notes' },
      admin: {
        description: {
          zh: '访客提交预约时填写的留言。',
          en: 'Notes the visitor filled in when submitting the reservation.',
        },
      },
    },
    {
      // Moved up from the end of the form so it sits next to the visitor's
      // notes — admins were missing it down at the bottom. Same field /
      // column name as before so no migration.
      name: 'internalNotes',
      type: 'textarea',
      label: { zh: '内部备注', en: 'Internal notes' },
      admin: {
        description: {
          zh: '仅管理员可见。记录电话沟通、跟进、特殊说明等。',
          en: 'Staff-only. Use for call notes, follow-ups, and any context that should not be visible to the visitor.',
        },
      },
    },
    {
      name: 'language',
      type: 'select',
      label: { zh: '语言', en: 'Language' },
      required: true,
      defaultValue: 'zh',
      options: [
        { label: '中文', value: 'zh' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: { zh: '状态', en: 'Status' },
      required: true,
      defaultValue: 'pending',
      options: [
        { label: { zh: '待确认', en: 'Pending' }, value: 'pending' },
        { label: { zh: '已确认', en: 'Confirmed' }, value: 'confirmed' },
        { label: { zh: '候补', en: 'Waitlist' }, value: 'waitlist' },
        { label: { zh: '已取消', en: 'Cancelled' }, value: 'cancelled' },
        { label: { zh: '已删除', en: 'Deleted' }, value: 'deleted' },
      ],
    },
    {
      name: 'emailStatus',
      type: 'select',
      label: { zh: '邮件状态', en: 'Email status' },
      defaultValue: 'pending',
      options: ['pending', 'sent', 'failed', 'no_email'].map((v) => ({
        label: v,
        value: v,
      })),
    },
    {
      name: 'confirmedAt',
      type: 'date',
      label: { zh: '确认时间', en: 'Confirmed at' },
      admin: { readOnly: true },
    },
    {
      name: 'confirmedBy',
      type: 'relationship',
      label: { zh: '确认人', en: 'Confirmed by' },
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'deletedAt',
      type: 'date',
      label: { zh: '删除时间', en: 'Deleted at' },
      admin: { readOnly: true },
    },
    {
      name: 'deletedBy',
      type: 'relationship',
      label: { zh: '删除人', en: 'Deleted by' },
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'reminderSentAt',
      type: 'date',
      label: { zh: '提醒发送时间', en: 'Reminder sent at' },
      admin: { readOnly: true },
    },
    {
      // Override Payload's built-in `createdAt` so the list view shows a
      // short M/d HH:mm form instead of the verbose default locale string.
      // Same column, same data — only the admin cell format changes.
      name: 'createdAt',
      type: 'date',
      label: { zh: '创建时间', en: 'Created' },
      admin: {
        readOnly: true,
        date: {
          displayFormat: 'M/d HH:mm',
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  hooks: {
    beforeChange: [reservationsBeforeChange as any],
    afterChange: [reservationsAfterChange as any],
  },
}
