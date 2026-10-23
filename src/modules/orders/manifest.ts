import { ShoppingBagIcon } from 'lucide-react';
import { PERMISSIONS } from '@/shared/constants/permissions';
import type { ModuleManifest } from '../manifest';

export const ordersManifest: ModuleManifest = {
  name: 'orders',
  contributions: {
    public: {
      nav: [],
      routeLabels: {
        '/orders': 'Mis pedidos',
        '/orders/[id]': 'Pedido',
      },
    },
    dashboard: {
      nav: [
        {
          id: 'orders',
          label: 'Pedidos',
          href: '/dashboard/orders',
          icon: ShoppingBagIcon,
          permission: PERMISSIONS.orders.manage,
          group: 'admin',
        },
      ],
      routeLabels: {
        '/dashboard/orders': 'Pedidos',
        '/dashboard/orders/[id]': 'Detalle de pedido',
      },
    },
  },
};
