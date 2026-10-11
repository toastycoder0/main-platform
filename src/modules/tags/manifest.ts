import { TagIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const tagsManifest: ModuleManifest = {
  name: 'tags',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'tags',
          label: 'Etiquetas',
          href: '/dashboard/tags',
          icon: TagIcon,
          permission: PERMISSIONS.admin.tags.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/tags': 'Etiquetas',
        '/dashboard/tags/new': 'Crear etiqueta',
        '/dashboard/tags/form/[id]': 'Editar etiqueta',
      },
    },
  },
};
