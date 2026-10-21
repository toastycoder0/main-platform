import type { ModuleManifest } from '../manifest';

export const cartManifest: ModuleManifest = {
  name: 'cart',
  contributions: {
    public: {
      nav: [],
      routeLabels: { '/cart': 'Carrito' },
    },
  },
};
