import { RulerIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const productUnitsManifest: ModuleManifest = {
  name: 'product-units',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'product-units',
          label: 'Unidades de medida',
          href: '/dashboard/product-units',
          icon: RulerIcon,
          permission: PERMISSIONS.admin.productUnits.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/product-units': 'Unidades de medida',
        '/dashboard/product-units/new': 'Crear unidad de medida',
        '/dashboard/product-units/form/[id]': 'Editar unidad de medida',
      },
    },
  },
};
