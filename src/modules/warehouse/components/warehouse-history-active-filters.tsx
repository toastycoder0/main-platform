'use client';

import { XIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { Button } from '@/shared/components/button';
import type { MovementCellOptionDTO, MovementLotOptionDTO } from '../application/warehouse.types';
import { movementHistoryParams } from '../infrastructure/warehouse.params';
import { MOVEMENT_REASON_LABELS, MOVEMENT_TYPE_LABELS } from './warehouse-history-config';

interface MovementHistoryActiveFiltersProps {
  lots: MovementLotOptionDTO[];
  cells: MovementCellOptionDTO[];
}

interface ActiveFilterChip {
  key: string;
  label: string;
  remove: () => void;
}

type ClearedFilter = 'type' | 'reason' | 'from' | 'to' | 'lot' | 'cell';

export function MovementHistoryActiveFilters({ lots, cells }: MovementHistoryActiveFiltersProps) {
  const [params, setParams] = useQueryStates(movementHistoryParams);
  const [isPending, startTransition] = useTransition();

  const lotLabels = new Map(
    lots.map((lot) => [lot.id, `${lot.code} — ${lot.productTitle} / ${lot.itemTitle}`]),
  );
  const cellLabels = new Map(cells.map((cell) => [cell.id, cell.code]));

  function clearFilter(patch: Partial<Record<ClearedFilter, null>>) {
    startTransition(() => {
      setParams({ ...params, ...patch, page: 1 });
    });
  }

  const chips: ActiveFilterChip[] = [];

  if (params.type) {
    chips.push({
      key: 'type',
      label: MOVEMENT_TYPE_LABELS[params.type],
      remove: () => clearFilter({ type: null }),
    });
  }
  if (params.reason) {
    chips.push({
      key: 'reason',
      label: MOVEMENT_REASON_LABELS[params.reason],
      remove: () => clearFilter({ reason: null }),
    });
  }
  if (params.from) {
    chips.push({
      key: 'from',
      label: `Desde ${params.from}`,
      remove: () => clearFilter({ from: null }),
    });
  }
  if (params.to) {
    chips.push({
      key: 'to',
      label: `Hasta ${params.to}`,
      remove: () => clearFilter({ to: null }),
    });
  }
  if (params.lot) {
    chips.push({
      key: 'lot',
      label: lotLabels.get(params.lot) ?? params.lot,
      remove: () => clearFilter({ lot: null }),
    });
  }
  if (params.cell) {
    chips.push({
      key: 'cell',
      label: cellLabels.get(params.cell) ?? params.cell,
      remove: () => clearFilter({ cell: null }),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <fieldset
      aria-busy={isPending}
      aria-label='Filtros activos'
      className='flex flex-wrap items-center gap-2'
    >
      {chips.map((chip) => (
        <button
          aria-label={`Quitar filtro ${chip.label}`}
          className='flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted'
          key={chip.key}
          onClick={chip.remove}
          type='button'
        >
          {chip.label}
          <XIcon className='size-3 text-muted-foreground' />
        </button>
      ))}
      <Button
        className='h-6 px-2 text-xs font-medium'
        onClick={() =>
          clearFilter({
            type: null,
            reason: null,
            from: null,
            to: null,
            lot: null,
            cell: null,
          })
        }
        size='sm'
        type='button'
        variant='ghost'
      >
        Limpiar todo
      </Button>
    </fieldset>
  );
}
