import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { zh: '账号', en: 'User' },
    plural: { zh: '账号', en: 'Users' },
  },
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'name'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (req.user?.id != null) return { id: { equals: req.user.id } }
      return false
    },
    create: isAdmin,
    update: ({ req, id }) =>
      // admin can edit anyone; staff can only edit themselves
      req.user?.role === 'admin' || req.user?.id === id,
    delete: isAdmin,
    // Both admins and staff can access the admin UI
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: { zh: '姓名', en: 'Name' },
    },
    {
      name: 'role',
      type: 'select',
      label: { zh: '角色', en: 'Role' },
      required: true,
      defaultValue: 'staff',
      options: [
        { label: { zh: '管理员', en: 'Admin' }, value: 'admin' },
        { label: { zh: '义工', en: 'Staff' }, value: 'staff' },
      ],
      // Only admins can change the role field
      access: {
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
    {
      // Per-academy scope for staff accounts. When set on a `staff` user,
      // they can only read/create/update Activities, Reservations, and
      // Journal entries for THIS academy (enforced via byStaffLocation in
      // each collection's access + forceStaffLocation in beforeChange).
      // Ignored for admin users.
      name: 'staffLocation',
      type: 'relationship',
      label: { zh: '所属学堂', en: 'Staff academy' },
      relationTo: 'locations',
      admin: {
        description: {
          zh: '义工只能看/编辑这个学堂的活动、预约、笔记。管理员忽略此字段。一对一 — 想让账号跨学堂请改成"管理员"角色。',
          en: 'Staff can only read/edit activities, reservations, and journal entries for this academy. Ignored for admin role. One-to-one — for multi-academy access, promote to "Admin".',
        },
        condition: (data) => data?.role === 'staff',
      },
      // Only admin can set or change which academy a staff member belongs to
      access: {
        update: ({ req }) => req.user?.role === 'admin',
        create: ({ req }) => req.user?.role === 'admin',
      },
    },
  ],
}
