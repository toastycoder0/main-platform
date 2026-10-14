import { ListOrderedIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const priceListsManifest: ModuleManifest = {
  name: 'price-lists',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'price-lists',
          label: 'Listas de precios',
          href: '/dashboard/price-lists',
          icon: ListOrderedIcon,
          permission: PERMISSIONS.admin.priceLists.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/price-lists': 'Listas de precios',
        '/dashboard/price-lists/new': 'Crear lista de precios',
        '/dashboard/price-lists/form/[id]': 'Editar lista de precios',
      },
    },
  },
};
