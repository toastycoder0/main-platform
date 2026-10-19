import { buildListHref } from '@/shared/list/list-params';
import type { MovementFormKind } from './warehouse.movement';

export const WAREHOUSE_VIEWS = ['lots', 'map'] as const;

export type WarehouseView = (typeof WAREHOUSE_VIEWS)[number];

export const WAREHOUSE_VIEW_LABELS: Record<WarehouseView, string> = {
  lots: 'Lotes',
  map: 'Mapa',
};

export interface MovementLink {
  id: MovementFormKind;
  href: string;
}

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

export function buildMovementLinks(
  allowedKinds: readonly MovementFormKind[],
  view: WarehouseView,
  q: string | null,
  page: number,
  pageSize: number,
): MovementLink[] {
  return allowedKinds.map((id) => ({
    id,
    href: buildListHref('/warehouse', {
      view: view === 'lots' ? null : view,
      q,
      page,
      pageSize,
      movement: id,
    }),
  }));
}
