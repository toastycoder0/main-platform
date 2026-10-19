'use client';

import { ChevronDownIcon, ListFilterIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/dropdown-menu';
import { ListToolbar } from '@/shared/components/list-toolbar';
import type { MovementCellOptionDTO, MovementLotOptionDTO } from '../application/warehouse.types';
import { useMovementHistoryFilters } from './use-movement-history-filters';
import {
  MOVEMENT_FILTER_OPTIONS,
  MOVEMENT_HISTORY_COPY,
  type MovementHistoryView,
} from './warehouse-history-config';
import { WarehouseHistoryDateRange } from './warehouse-history-date-range';
import { MovementHistoryFilterDrawer } from './warehouse-history-filter-drawer';
import { type WarehouseOption, WarehouseOptionCombobox } from './warehouse-option-combobox';

interface MovementHistoryFilterBarProps {
  view: MovementHistoryView;
  lots: MovementLotOptionDTO[];
  cells: MovementCellOptionDTO[];
}

function lotOption(lot: MovementLotOptionDTO): WarehouseOption {
  return {
    value: lot.id,
    label: `${lot.code} — ${lot.productTitle} / ${lot.itemTitle}`,
  };
}

function cellOption(cell: MovementCellOptionDTO): WarehouseOption {
  return { value: cell.id, label: cell.code };
}

export function MovementHistoryFilterBar({ view, lots, cells }: MovementHistoryFilterBarProps) {
  const { params, isPending, hasFilters, update, toggleMovement, clearFilters } =
    useMovementHistoryFilters();
  const copy = MOVEMENT_HISTORY_COPY[view];
  const selectedType = MOVEMENT_FILTER_OPTIONS.find((option) =>
    params.movements.includes(option.value),
  );

  const typeLabel =
    params.movements.length === 0
      ? 'Tipo'
      : params.movements.length === 1
        ? (selectedType?.label ?? 'Tipo')
        : `${params.movements.length} tipos`;

  return (
    <ListToolbar
      className='items-start lg:items-center'
      inputClassName='sm:w-80 lg:w-72'
      searchLabel={copy.searchLabel}
      searchPlaceholder={copy.searchPlaceholder}
    >
      <div
        aria-busy={isPending}
        className='hidden w-full flex-wrap items-center gap-2 lg:flex lg:w-auto'
        data-slot='warehouse-history-filter-bar'
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label='Filtrar por tipo de movimiento'
              size='sm'
              type='button'
              variant='outline'
            >
              <ListFilterIcon />
              <span className='max-w-40 truncate'>{typeLabel}</span>
              <ChevronDownIcon className='opacity-50' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start' className='w-56'>
            {MOVEMENT_FILTER_OPTIONS.map((option) => (
              <DropdownMenuCheckboxItem
                checked={params.movements.includes(option.value)}
                key={option.value}
                onCheckedChange={() => toggleMovement(option.value)}
                onSelect={(event) => event.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className='w-48'>
          <WarehouseHistoryDateRange
            from={params.from}
            id='history-bar-date-range'
            onChange={(range) => update(range)}
            to={params.to}
          />
        </div>

        <WarehouseOptionCombobox
          className='w-44'
          contentClassName='w-96'
          id='history-bar-lot'
          items={lots.map(lotOption)}
          label='Filtrar por lote'
          onValueChange={(value) => update({ lot: value || null })}
          placeholder='Lote'
          value={params.lot ?? ''}
        />

        <WarehouseOptionCombobox
          className='w-32'
          id='history-bar-cell'
          items={cells.map(cellOption)}
          label='Filtrar por celda'
          onValueChange={(value) => update({ cell: value || null })}
          placeholder='Celda'
          value={params.cell ?? ''}
        />

        <Button
          disabled={!hasFilters || isPending}
          onClick={clearFilters}
          size='sm'
          type='button'
          variant='ghost'
        >
          <RotateCcwIcon />
          Limpiar
        </Button>
      </div>

      <div className='lg:hidden'>
        <MovementHistoryFilterDrawer cells={cells} lots={lots} />
      </div>
    </ListToolbar>
  );
}
