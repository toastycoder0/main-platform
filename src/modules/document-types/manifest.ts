import { FileTextIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const documentTypesManifest: ModuleManifest = {
  name: 'document-types',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'document-types',
          label: 'Tipos de documento',
          href: '/dashboard/document-types',
          icon: FileTextIcon,
          permission: PERMISSIONS.admin.documentTypes.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/document-types': 'Tipos de documento',
        '/dashboard/document-types/new': 'Crear tipo de documento',
        '/dashboard/document-types/form/[id]': 'Editar tipo de documento',
      },
    },
  },
};
