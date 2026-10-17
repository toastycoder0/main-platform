import { AwardIcon } from 'lucide-react';
import { PERMISSION_GROUP_LABELS, PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const brandsManifest: ModuleManifest = {
  name: 'brands',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'brands',
          label: PERMISSION_GROUP_LABELS['admin.brands'],
          href: '/dashboard/brands',
          icon: AwardIcon,
          permission: PERMISSIONS.admin.brands.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/brands': 'Marcas',
        '/dashboard/brands/new': 'Crear marca',
        '/dashboard/brands/form/[id]': 'Editar marca',
      },
    },
  },
};
