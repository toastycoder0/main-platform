'use client';

import { useQueryStates } from 'nuqs';
import { useTransition } from 'react';
import { Field, FieldLabel } from '@/shared/components/field';
import { Input } from '@/shared/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/select';
import type { MovementCellOptionDTO, MovementLotOptionDTO } from '../application/warehouse.types';
import type { MovementReason, MovementType } from '../application/warehouse.validation';
import { movementHistoryParams } from '../infrastructure/warehouse.params';
import { MOVEMENT_REASON_OPTIONS, MOVEMENT_TYPE_OPTIONS } from './warehouse-history-config';
import { type WarehouseOption, WarehouseOptionCombobox } from './warehouse-option-combobox';

interface MovementHistoryFiltersProps {
  idPrefix: string;
  lots: MovementLotOptionDTO[];
  cells: MovementCellOptionDTO[];
}

interface FilterPatch {
  type?: MovementType | null;
  reason?: MovementReason | null;
  from?: string | null;
  to?: string | null;
  lot?: string | null;
  cell?: string | null;
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
  const [params, setParams] = useQueryStates(movementHistoryParams);
  const [isPending, startTransition] = useTransition();

  function fieldId(name: string): string {
    return `${idPrefix}-${name}`;
  }

  function update(patch: FilterPatch) {
    startTransition(() => {
      setParams({ ...params, ...patch, page: 1 });
    });
  }

  return (
    <div aria-busy={isPending} className='flex flex-col gap-6'>
      <section className='flex flex-col gap-2'>
        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground'>Tipo y motivo</h3>
        <div className='flex flex-col gap-3'>
          <Field orientation='vertical'>
            <FieldLabel htmlFor={fieldId('type')}>Tipo</FieldLabel>
            <Select
              onValueChange={(value) =>
                update({ type: value === 'all' ? null : (value as MovementType) })
              }
              value={params.type ?? 'all'}
            >
              <SelectTrigger
                aria-label='Tipo de movimiento'
                className='w-full'
                id={fieldId('type')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                {MOVEMENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field orientation='vertical'>
            <FieldLabel htmlFor={fieldId('reason')}>Motivo</FieldLabel>
            <Select
              onValueChange={(value) =>
                update({ reason: value === 'all' ? null : (value as MovementReason) })
              }
              value={params.reason ?? 'all'}
            >
              <SelectTrigger
                aria-label='Motivo del movimiento'
                className='w-full'
                id={fieldId('reason')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Todos</SelectItem>
                {MOVEMENT_REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className='flex flex-col gap-2'>
        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground'>Fecha</h3>
        <div className='grid gap-2'>
          <Field orientation='vertical'>
            <FieldLabel htmlFor={fieldId('from')}>Desde</FieldLabel>
            <Input
              id={fieldId('from')}
              onChange={(event) => update({ from: event.target.value || null })}
              type='date'
              value={params.from ?? ''}
            />
          </Field>
          <Field orientation='vertical'>
            <FieldLabel htmlFor={fieldId('to')}>Hasta</FieldLabel>
            <Input
              id={fieldId('to')}
              onChange={(event) => update({ to: event.target.value || null })}
              type='date'
              value={params.to ?? ''}
            />
          </Field>
        </div>
      </section>

      <section className='flex flex-col gap-2'>
        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground'>Ubicación</h3>
        <div className='flex flex-col gap-3'>
          <Field orientation='vertical'>
            <FieldLabel htmlFor={fieldId('lot')}>Lote</FieldLabel>
            <WarehouseOptionCombobox
              className='w-full'
              id={fieldId('lot')}
              items={lots.map(lotOption)}
              label='Filtrar por lote'
              onValueChange={(value) => update({ lot: value || null })}
              placeholder='Buscar lote...'
              value={params.lot ?? ''}
            />
          </Field>

          <Field orientation='vertical'>
            <FieldLabel htmlFor={fieldId('cell')}>Celda</FieldLabel>
            <WarehouseOptionCombobox
              className='w-full'
              id={fieldId('cell')}
              items={cells.map(cellOption)}
              label='Filtrar por celda'
              onValueChange={(value) => update({ cell: value || null })}
              placeholder='Buscar celda...'
              value={params.cell ?? ''}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
