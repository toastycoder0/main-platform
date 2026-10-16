export const PERMISSIONS = {
  warehouse: {
    access: 'warehouse.access',
    lots: {
      access: 'warehouse.lots.access',
      create: 'warehouse.lots.create',
      edit: 'warehouse.lots.edit',
    },
    map: {
      access: 'warehouse.map.access',
      edit: 'warehouse.map.edit',
    },
    stock: {
      reception: 'warehouse.stock.reception',
      transfer: 'warehouse.stock.transfer',
      materialOut: 'warehouse.stock.materialOut',
      delivery: 'warehouse.stock.delivery',
      revert: 'warehouse.stock.revert',
    },
  },
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
    documentTypes: {
      access: 'admin.documentTypes.access',
      create: 'admin.documentTypes.create',
      edit: 'admin.documentTypes.edit',
      delete: 'admin.documentTypes.delete',
    },
    currencies: {
      access: 'admin.currencies.access',
      create: 'admin.currencies.create',
      edit: 'admin.currencies.edit',
      delete: 'admin.currencies.delete',
    },
    exchangeRates: {
      access: 'admin.exchangeRates.access',
      create: 'admin.exchangeRates.create',
      edit: 'admin.exchangeRates.edit',
      delete: 'admin.exchangeRates.delete',
    },
    priceLists: {
      access: 'admin.priceLists.access',
      create: 'admin.priceLists.create',
      edit: 'admin.priceLists.edit',
      delete: 'admin.priceLists.delete',
    },
    products: {
      access: 'admin.products.access',
      create: 'admin.products.create',
      edit: 'admin.products.edit',
      delete: 'admin.products.delete',
    },
  },
} as const;
