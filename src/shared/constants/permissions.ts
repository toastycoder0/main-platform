export const PERMISSIONS = {
  admin: {
    access: 'admin.access',
    users: {
      access: 'admin.users.access',
      create: 'admin.users.create',
      edit: 'admin.users.edit',
      delete: 'admin.users.delete',
    },
    roles: {
      access: 'admin.roles.access',
      create: 'admin.roles.create',
      edit: 'admin.roles.edit',
    },
  },
} as const;
