import { ShieldIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const rolesManifest: ModuleManifest = {
  name: 'roles',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'roles',
          label: 'Roles',
          href: '/dashboard/roles',
          icon: ShieldIcon,
          permission: PERMISSIONS.admin.roles.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/roles': 'Roles',
      },
    },
  },
};
