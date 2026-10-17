export const WAREHOUSE_VIEWS = ['lots', 'map'] as const;

export type WarehouseView = (typeof WAREHOUSE_VIEWS)[number];

export const WAREHOUSE_VIEW_LABELS: Record<WarehouseView, string> = {
  lots: 'Lotes',
  map: 'Mapa',
};

export function resolveWarehouseView(
  requested: WarehouseView,
  canLots: boolean,
  canMap: boolean,
): WarehouseView | null {
  if (requested === 'lots' && canLots) {
    return 'lots';
  }

  if (requested === 'map' && canMap) {
    return 'map';
  }

  if (canLots) {
    return 'lots';
  }

  if (canMap) {
    return 'map';
  }

  return null;
}
