import { PackageIcon } from 'lucide-react';
import { PERMISSION_GROUP_LABELS, PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const productsManifest: ModuleManifest = {
  name: 'products',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'products',
          label: PERMISSION_GROUP_LABELS['admin.products'],
          href: '/dashboard/products',
          icon: PackageIcon,
          permission: PERMISSIONS.admin.products.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/products': 'Productos',
        '/dashboard/products/new': 'Crear producto',
        '/dashboard/products/form/[id]': 'Editar producto',
      },
    },
  },
};
