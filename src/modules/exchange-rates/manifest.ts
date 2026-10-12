import { ArrowLeftRightIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const exchangeRatesManifest: ModuleManifest = {
  name: 'exchange-rates',
  contributions: {
    dashboard: {
      nav: [
        {
          id: 'exchange-rates',
          label: 'Tipos de cambio',
          href: '/dashboard/exchange-rates',
          icon: ArrowLeftRightIcon,
          permission: PERMISSIONS.admin.exchangeRates.access,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/exchange-rates': 'Tipos de cambio',
        '/dashboard/exchange-rates/new': 'Crear tipo de cambio',
        '/dashboard/exchange-rates/form/[id]': 'Editar tipo de cambio',
      },
    },
  },
};
