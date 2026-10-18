'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { XIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { Button } from '@/shared/components/button';
import type { MovementCellOptionDTO, MovementLotOptionDTO } from '../application/warehouse.types';
import type { MovementFilterValue } from '../application/warehouse.validation';
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

interface ActiveFilterPatch {
  movements?: MovementFilterValue[];
  from?: null;
  to?: null;
  lot?: null;
  cell?: null;
}

type ClearFilter = (patch: ActiveFilterPatch) => void;

function formatFilterDate(value: string): string {
  return format(parseISO(value), 'dd MMM yyyy', { locale: es });
}

function movementChips(
  movements: MovementFilterValue[],
  clearFilter: ClearFilter,
): ActiveFilterChip[] {
  return movements.map((value) => ({
    key: `movement-${value}`,
    label: value === 'revert' ? MOVEMENT_TYPE_LABELS.revert : MOVEMENT_REASON_LABELS[value],
    remove: () => clearFilter({ movements: movements.filter((item) => item !== value) }),
  }));
}

function dateChips(
  from: string | null,
  to: string | null,
  clearFilter: ClearFilter,
): ActiveFilterChip[] {
  if (!from && !to) {
    return [];
  }

  const label =
    from && to
      ? `${formatFilterDate(from)} – ${formatFilterDate(to)}`
      : from
        ? `Desde ${formatFilterDate(from)}`
        : `Hasta ${formatFilterDate(to ?? '')}`;

  return [
    {
      key: 'date',
      label,
      remove: () => clearFilter({ from: null, to: null }),
    },
  ];
}

function locationChips(
  lotId: string | null,
  cellId: string | null,
  lotLabels: Map<string, string>,
  cellLabels: Map<string, string>,
  clearFilter: ClearFilter,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (lotId) {
    chips.push({
      key: 'lot',
      label: lotLabels.get(lotId) ?? lotId,
      remove: () => clearFilter({ lot: null }),
    });
  }
  if (cellId) {
    chips.push({
      key: 'cell',
      label: cellLabels.get(cellId) ?? cellId,
      remove: () => clearFilter({ cell: null }),
    });
  }

  return chips;
}

export function MovementHistoryActiveFilters({ lots, cells }: MovementHistoryActiveFiltersProps) {
  const [params, setParams] = useQueryStates(movementHistoryParams);
  const [isPending, startTransition] = useTransition();

  const lotLabels = new Map(
    lots.map((lot) => [lot.id, `${lot.code} — ${lot.productTitle} / ${lot.itemTitle}`]),
  );
  const cellLabels = new Map(cells.map((cell) => [cell.id, cell.code]));

  function clearFilter(patch: ActiveFilterPatch) {
    startTransition(() => {
      setParams({ ...params, ...patch, page: 1 });
    });
  }

  const chips = [
    ...movementChips(params.movements, clearFilter),
    ...dateChips(params.from, params.to, clearFilter),
    ...locationChips(params.lot, params.cell, lotLabels, cellLabels, clearFilter),
  ];

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
            movements: [],
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
