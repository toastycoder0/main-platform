'use client';

import { RotateCcwIcon } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Checkbox } from '@/shared/components/checkbox';
import { cn } from '@/shared/utils/cn';
import type { MovementCellOptionDTO, MovementLotOptionDTO } from '../application/warehouse.types';
import { useMovementHistoryFilters } from './use-movement-history-filters';
import { MOVEMENT_FILTER_OPTIONS } from './warehouse-history-config';
import { WarehouseHistoryDateRange } from './warehouse-history-date-range';
import { type WarehouseOption, WarehouseOptionCombobox } from './warehouse-option-combobox';

interface MovementHistoryFiltersProps {
  idPrefix: string;
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

export function MovementHistoryFilters({ idPrefix, lots, cells }: MovementHistoryFiltersProps) {
  const { params, isPending, hasFilters, update, toggleMovement, clearFilters } =
    useMovementHistoryFilters();

  function fieldId(name: string): string {
    return `${idPrefix}-${name}`;
  }

  return (
    <div aria-busy={isPending} className='flex flex-col gap-5'>
      <section className='flex flex-col gap-2 border-b pb-4'>
        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground'>Movimiento</h3>
        <div className='flex flex-col gap-0.5'>
          {MOVEMENT_FILTER_OPTIONS.map((option) => {
            const checked = params.movements.includes(option.value);
            const optionId = fieldId(`movement-${option.value}`);

            return (
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                  checked
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                htmlFor={optionId}
                key={option.value}
              >
                <Checkbox
                  aria-label={option.label}
                  checked={checked}
                  id={optionId}
                  onCheckedChange={() => toggleMovement(option.value)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        <p className='px-2 text-xs text-muted-foreground'>Sin selección se muestran todos.</p>
      </section>

      <section className='flex flex-col gap-2 border-b pb-4'>
        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground'>Fecha</h3>
        <WarehouseHistoryDateRange
          from={params.from}
          id={fieldId('date-range')}
          onChange={(range) => update(range)}
          to={params.to}
        />
        <p className='px-2 text-xs text-muted-foreground'>Selecciona la fecha inicial y final.</p>
      </section>

      <section className='flex flex-col gap-2 border-b pb-4'>
        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground'>Ubicación</h3>
        <div className='flex flex-col gap-2'>
          <WarehouseOptionCombobox
            className='w-full'
            id={fieldId('lot')}
            items={lots.map(lotOption)}
            label='Filtrar por lote'
            onValueChange={(value) => update({ lot: value || null })}
            placeholder='Buscar lote...'
            value={params.lot ?? ''}
          />

          <WarehouseOptionCombobox
            className='w-full'
            id={fieldId('cell')}
            items={cells.map(cellOption)}
            label='Filtrar por celda'
            onValueChange={(value) => update({ cell: value || null })}
            placeholder='Buscar celda...'
            value={params.cell ?? ''}
          />
        </div>
      </section>

      <Button
        className='justify-start px-2'
        disabled={!hasFilters || isPending}
        onClick={clearFilters}
        size='sm'
        type='button'
        variant='ghost'
      >
        <RotateCcwIcon />
        Limpiar filtros
      </Button>
    </div>
  );
}
