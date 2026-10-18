import Link from 'next/link';
import { ListCreateButton } from '@/shared/components/list-create-button';
import { ListToolbar } from '@/shared/components/list-toolbar';
import { buildListHref } from '@/shared/list/list-params';
import { cn } from '@/shared/utils/cn';
import {
  WAREHOUSE_VIEW_LABELS,
  WAREHOUSE_VIEWS,
  type WarehouseView,
} from '../application/warehouse.view';
import { type WarehouseMovementId, WarehouseMovementsMenu } from './warehouse-movements-menu';

interface WarehouseToolbarProps {
  view: WarehouseView;
  canLots: boolean;
  canMap: boolean;
  canCreateLot: boolean;
  q: string | null;
  page: number;
  pageSize: number;
  movementLinks: Array<{ id: WarehouseMovementId; href: string }>;
}

function buildViewHref(
  view: WarehouseView,
  q: string | null,
  page: number,
  pageSize: number,
): string {
  return buildListHref('/warehouse', {
    view: view === 'lots' ? null : view,
    q,
    page,
    pageSize,
  });
}

export function WarehouseToolbar({
  view,
  canLots,
  canMap,
  canCreateLot,
  q,
  page,
  pageSize,
  movementLinks,
}: WarehouseToolbarProps) {
  const views = WAREHOUSE_VIEWS.filter((item) => (item === 'lots' ? canLots : canMap));

  return (
    <div className='flex flex-wrap items-center gap-3 md:flex-nowrap'>
      {views.length > 1 ? (
        <div
          aria-label='Vistas del almacén'
          className='order-1 inline-flex h-9 items-center rounded-lg bg-muted p-[3px]'
          role='tablist'
        >
          {views.map((item) => {
            const active = item === view;

            return (
              <Link
                aria-selected={active}
                className={cn(
                  'inline-flex h-full items-center rounded-md px-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                href={buildViewHref(item, q, page, pageSize)}
                key={item}
                role='tab'
              >
                {WAREHOUSE_VIEW_LABELS[item]}
              </Link>
            );
          })}
        </div>
      ) : null}

      {movementLinks.length > 0 || (view === 'lots' && canCreateLot) ? (
        <div className='order-2 ml-auto flex items-center gap-2 md:order-3 md:ml-0'>
          <WarehouseMovementsMenu items={movementLinks} />
          {view === 'lots' && canCreateLot ? (
            <ListCreateButton href='/warehouse/lots/new'>
              <span className='hidden md:inline'>Crear lote</span>
              <span className='sr-only md:hidden'>Crear lote</span>
            </ListCreateButton>
          ) : null}
        </div>
      ) : null}

      <div className='order-3 w-full min-w-0 md:order-2 md:ml-auto md:w-80'>
        <ListToolbar
          searchLabel={view === 'map' ? 'Buscar en el almacén' : 'Buscar lotes'}
          searchPlaceholder={
            view === 'map'
              ? 'Buscar por producto, lote o celda…'
              : 'Buscar por producto, variante o lote…'
          }
        />
      </div>
    </div>
  );
}
