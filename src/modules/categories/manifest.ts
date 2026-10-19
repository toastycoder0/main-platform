import { FolderTreeIcon } from 'lucide-react';
import { PERMISSION_GROUP_LABELS, PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const categoriesManifest: ModuleManifest = {
  name: 'categories',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'categories',
          label: PERMISSION_GROUP_LABELS['admin.categories'],
          href: '/dashboard/categories',
          icon: FolderTreeIcon,
          permission: PERMISSIONS.admin.categories.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/categories': 'Categorías',
        '/dashboard/categories/new': 'Nueva categoría',
        '/dashboard/categories/form/[id]': 'Editar categoría',
      },
    },
  },
};
