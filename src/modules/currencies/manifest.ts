import { BadgeDollarSignIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const currenciesManifest: ModuleManifest = {
  name: 'currencies',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'currencies',
          label: 'Monedas',
          href: '/dashboard/currencies',
          icon: BadgeDollarSignIcon,
          permission: PERMISSIONS.admin.currencies.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/currencies': 'Monedas',
        '/dashboard/currencies/new': 'Crear moneda',
        '/dashboard/currencies/form/[code]': 'Editar moneda',
      },
    },
  },
};
