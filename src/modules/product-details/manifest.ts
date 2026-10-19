import type { ModuleManifest } from '../manifest';

export const productDetailsManifest: ModuleManifest = {
  name: 'product-details',
  contributions: {
    public: {
      nav: [],
      routeLabels: { '/product/[slug]': 'Producto' },
    },
  },
};
