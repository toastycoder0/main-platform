import { UsersIcon } from 'lucide-react';
import { PERMISSION_GROUP_LABELS, PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const usersManifest: ModuleManifest = {
  name: 'users',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'users',
          label: PERMISSION_GROUP_LABELS['admin.users'],
          href: '/dashboard/users',
          icon: UsersIcon,
          permission: PERMISSIONS.admin.users.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/users': 'Usuarios',
        '/dashboard/users/new': 'Crear usuario',
        '/dashboard/users/form/[id]': 'Editar usuario',
      },
    },
  },
};
