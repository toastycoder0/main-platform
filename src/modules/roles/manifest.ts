import { ShieldIcon } from 'lucide-react';
import { PERMISSION_GROUP_LABELS, PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const rolesManifest: ModuleManifest = {
  name: 'roles',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'roles',
          label: PERMISSION_GROUP_LABELS['admin.roles'],
          href: '/dashboard/roles',
          icon: ShieldIcon,
          permission: PERMISSIONS.admin.roles.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/roles': 'Roles',
        '/dashboard/roles/new': 'Crear rol',
        '/dashboard/roles/form/[id]': 'Editar rol',
      },
    },
  },
};
