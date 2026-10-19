export const PRODUCT_STATUSES = ['active', 'inactive', 'warehouse_only', 'unlisted'] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  warehouse_only: 'Solo almacén',
  unlisted: 'No listado',
};

/** Statuses reachable from public listings, search and category pages. */
export const PUBLIC_LISTING_STATUSES = ['active'] as const satisfies readonly ProductStatus[];

/**
 * Statuses a public detail page may render by direct URL. `unlisted` is hidden
 * from listings but still linkable.
 */
export const PUBLIC_DETAIL_STATUSES = [
  'active',
  'unlisted',
] as const satisfies readonly ProductStatus[];
