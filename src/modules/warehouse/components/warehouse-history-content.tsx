import type { RequestContext } from '@/infrastructure/context/types';
import { ListPagination } from '@/shared/components/list-pagination';
import type { ListHrefParams } from '@/shared/list/list-params';
import type { Paginated } from '@/shared/list/paginated';
import type { MovementEntryRowDTO, MovementListItemDTO } from '../application/warehouse.types';
import {
  type MovementHistoryFiltersSchema,
  movementHistoryFiltersSchema,
} from '../application/warehouse.validation';
import type { MovementHistoryParams } from '../infrastructure/warehouse.params';
import {
  getMovementHistoryOptions,
  listMovementEntries,
  listMovements,
} from '../infrastructure/warehouse.query';
import { MovementHistoryActiveFilters } from './warehouse-history-active-filters';
import type { MovementHistoryView } from './warehouse-history-config';
import { MovementHistoryEmptyState } from './warehouse-history-empty-state';
import { MovementHistoryFilterBar } from './warehouse-history-filter-bar';
import { WarehouseMovementEntriesTable } from './warehouse-movement-entries-table';
import { WarehouseMovementsTable } from './warehouse-movements-table';

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
  return movementHistoryFiltersSchema.parse({
    movements: params.movements,
    from: params.from ?? undefined,
    to: params.to ?? undefined,
    lotId: params.lot ?? undefined,
    cellId: params.cell ?? undefined,
  });
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
    <div className='flex min-w-0 flex-col gap-4'>
      <MovementHistoryFilterBar cells={options.cells} lots={options.lots} view={view} />

      <MovementHistoryActiveFilters cells={options.cells} lots={options.lots} />

      <MovementHistoryResults entries={entries} movements={movements} total={total} view={view} />

      <ListPagination basePath={basePath} extraParams={extraParams} params={params} total={total} />
    </div>
  );
}
