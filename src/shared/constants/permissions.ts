export const PERMISSIONS = {
  admin: {
    access: 'admin.access',
    users: {
      access: 'admin.users.access',
      create: 'admin.users.create',
      edit: 'admin.users.edit',
      delete: 'admin.users.delete',
      ban: 'admin.users.ban',
    },
    roles: {
      access: 'admin.roles.access',
      create: 'admin.roles.create',
      edit: 'admin.roles.edit',
    },
    files: {
      upload: 'admin.files.upload',
    },
    categories: {
      access: 'admin.categories.access',
      create: 'admin.categories.create',
      edit: 'admin.categories.edit',
      delete: 'admin.categories.delete',
    },
    brands: {
      access: 'admin.brands.access',
      create: 'admin.brands.create',
      edit: 'admin.brands.edit',
      delete: 'admin.brands.delete',
    },
    tags: {
      access: 'admin.tags.access',
      create: 'admin.tags.create',
      edit: 'admin.tags.edit',
      delete: 'admin.tags.delete',
    },
    productUnits: {
      access: 'admin.productUnits.access',
      create: 'admin.productUnits.create',
      edit: 'admin.productUnits.edit',
      delete: 'admin.productUnits.delete',
    },
  },
} as const;
