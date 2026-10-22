import type { ModuleManifest } from '../manifest';

export const ordersManifest: ModuleManifest = {
  name: 'orders',
  contributions: {
    public: {
      nav: [],
      routeLabels: {
        '/orders': 'Pedidos',
        '/orders/[id]': 'Pedido',
      },
    },
  },
};
