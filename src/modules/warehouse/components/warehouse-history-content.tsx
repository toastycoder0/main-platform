import type { RequestContext } from '@/infrastructure/context/types';
import { ListPagination } from '@/shared/components/list-pagination';
import type { ListHrefParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { MovementEntryRowDTO, MovementListItemDTO } from '../application/warehouse.types';
import type { MovementHistoryFiltersSchema } from '../application/warehouse.validation';
import type { MovementHistoryParams } from '../infrastructure/warehouse.params';
import {
  getMovementHistoryOptions,
  listMovementEntries,
  listMovements,
} from '../infrastructure/warehouse.query';
import { MovementHistoryActiveFilters } from './warehouse-history-active-filters';
import { MovementHistoryEmptyState } from './warehouse-history-empty-state';
import { MovementHistoryFilterDrawer } from './warehouse-history-filter-drawer';
import { MovementHistoryFilters } from './warehouse-history-filters';
import { MovementHistoryTabs } from './warehouse-history-tabs';
import { WarehouseMovementEntriesTable } from './warehouse-movement-entries-table';
import { WarehouseMovementsTable } from './warehouse-movements-table';

type MovementHistoryView = 'movements' | 'entries';

interface WarehouseHistoryContentProps {
  ctx: RequestContext;
  params: MovementHistoryParams;
  view: MovementHistoryView;
}

interface MovementHistoryResultsProps {
  view: MovementHistoryView;
  movements?: Paginated<MovementListItemDTO> | undefined;
  entries?: Paginated<MovementEntryRowDTO> | undefined;
  total: number;
}

function MovementHistoryResults({ view, movements, entries, total }: MovementHistoryResultsProps) {
  if (view === 'movements') {
    if (movements && movements.items.length > 0) {
      return <WarehouseMovementsTable items={movements.items} />;
    }

    return <MovementHistoryEmptyState entity='movimientos' outOfRange={total > 0} />;
  }

  if (entries && entries.items.length > 0) {
    return <WarehouseMovementEntriesTable items={entries.items} />;
  }

  return <MovementHistoryEmptyState entity='elementos' outOfRange={total > 0} />;
}

function toFilters(params: MovementHistoryParams): MovementHistoryFiltersSchema {
  return {
    movements: params.movements,
    from: params.from ?? undefined,
    to: params.to ?? undefined,
    lotId: params.lot ?? undefined,
    cellId: params.cell ?? undefined,
  };
}

export async function WarehouseHistoryContent({ ctx, params, view }: WarehouseHistoryContentProps) {
  const options = await getMovementHistoryOptions(ctx);
  const filters = toFilters(params);
  const movements = view === 'movements' ? await listMovements(ctx, params, filters) : undefined;
  const entries = view === 'entries' ? await listMovementEntries(ctx, params, filters) : undefined;
  const total = movements?.total ?? entries?.total ?? 0;
  const basePath = view === 'movements' ? '/warehouse/movements' : '/warehouse/entries';
  const extraParams: ListHrefParams = {
    movements: params.movements.length > 0 ? params.movements.join(',') : null,
    from: params.from,
    to: params.to,
    lot: params.lot,
    cell: params.cell,
  };

  return (
    <div className='lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8'>
      <aside className='hidden lg:block'>
        <div className='lg:sticky lg:top-6'>
          <MovementHistoryFilters
            cells={options.cells}
            idPrefix='history-sidebar'
            lots={options.lots}
          />
        </div>
      </aside>

      <div className='flex min-w-0 flex-col gap-5'>
        <div
          className='flex flex-wrap items-center justify-between gap-3'
          data-slot='warehouse-history-summary'
        >
          <div className='flex items-center gap-3'>
            <MovementHistoryFilterDrawer cells={options.cells} lots={options.lots} />
            <p className='text-sm text-muted-foreground' data-slot='warehouse-history-count'>
              {total} {total === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>

          <MovementHistoryTabs view={view} />
        </div>

        <MovementHistoryActiveFilters cells={options.cells} lots={options.lots} />

        <MovementHistoryResults entries={entries} movements={movements} total={total} view={view} />

        <ListPagination
          basePath={basePath}
          extraParams={extraParams}
          params={params}
          total={total}
        />
      </div>
    </div>
  );
}
